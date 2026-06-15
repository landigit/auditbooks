import type {
  TDocumentDefinitions,
  Content,
  TableCell,
  CustomTableLayout,
  Style,
} from 'pdfmake/interfaces';
import type { PrintValues } from 'src/utils/types';
import { fyo } from 'src/initFyo';
import { ModelNameEnum } from 'models/types';
import { showToast } from 'src/utils/interactive';
import { t } from 'fyo';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnDef = {
  fieldname: string;
  label: string;
  width: string; // '*' | 'auto' | '80'
  align: 'left' | 'right' | 'center';
  visible: boolean;
};

/** Alias for the existing PrintValues type */
export type PdfInvoiceValues = PrintValues;

export type InvoiceStyleKey =
  | 'Modern'
  | 'POS'
  | 'Quote'
  | 'Classic';

export type InvoiceStylePreset = {
  label: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  headerTextColor: string;
  tableLayout: 'bordered' | 'lightLines' | 'noBorders' | 'thermal';
  pageSize: 'A4' | 'A5' | 'LETTER' | { width: number; height: number };
  pageMargins: [number, number, number, number];
  compactItems: boolean;
};

// ─── Style Presets ────────────────────────────────────────────────────────────

export const STYLE_PRESETS: Record<InvoiceStyleKey, InvoiceStylePreset> = {
  Modern: {
    label: 'Modern',
    description: 'Professional Modern style — dual address, shipping, order/invoice metadata',
    primaryColor: '#000000',
    accentColor: '#f3f4f6',
    headerTextColor: '#000000',
    tableLayout: 'bordered',
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 40],
    compactItems: false,
  },
  POS: {
    label: 'POS / Thermal',
    description: 'Compact thermal receipt — 80mm width, no borders',
    primaryColor: '#000000',
    accentColor: '#000000',
    headerTextColor: '#000000',
    tableLayout: 'thermal',
    pageSize: { width: 226.77, height: 800 },
    pageMargins: [8, 8, 8, 8],
    compactItems: true,
  },
  Quote: {
    label: 'Quotation',
    description: 'Professional quote — teal header, validity section',
    primaryColor: '#1e7a6e',
    accentColor: '#f59e0b',
    headerTextColor: '#ffffff',
    tableLayout: 'lightLines',
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 40],
    compactItems: false,
  },
  Classic: {
    label: 'Classic',
    description: 'Clean black & white — thin borders, no color fills',
    primaryColor: '#374151',
    accentColor: '#e5e7eb',
    headerTextColor: '#ffffff',
    tableLayout: 'bordered',
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 40],
    compactItems: false,
  },
};


// ─── Default columns ──────────────────────────────────────────────────────────

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { fieldname: 'idx',         label: '#',           width: '20',  align: 'center', visible: true },
  { fieldname: 'item',        label: 'Item',         width: '*',   align: 'left',   visible: true },
  { fieldname: 'description', label: 'Description',  width: '*',   align: 'left',   visible: false },
  { fieldname: 'hsnCode',     label: 'HSN/SAC',      width: '55',  align: 'center', visible: false },
  { fieldname: 'qty',         label: 'Qty',           width: '38',  align: 'center', visible: true },
  { fieldname: 'unit',        label: 'Unit',          width: '38',  align: 'center', visible: false },
  { fieldname: 'rate',        label: 'Rate',          width: '65',  align: 'right',  visible: true },
  { fieldname: 'tax',         label: 'Tax',           width: '48',  align: 'center', visible: true },
  { fieldname: 'amount',      label: 'Amount',        width: '72',  align: 'right',  visible: true },
  { fieldname: 'itemTaxedTotal', label: 'Total',     width: '72',  align: 'right',  visible: false },
  { fieldname: 'itemDiscountPercent', label: 'Disc%', width: '38', align: 'right',  visible: false },
];

export const ALL_AVAILABLE_FIELDS: ColumnDef[] = [
  ...DEFAULT_COLUMNS,
  { fieldname: 'batch',              label: 'Batch',         width: '55', align: 'left',   visible: false },
  { fieldname: 'transferUnit',       label: 'Transfer Unit', width: '55', align: 'center', visible: false },
  { fieldname: 'itemDiscountAmount', label: 'Disc Amt',      width: '65', align: 'right',  visible: false },
];

// ─── Config persistence ───────────────────────────────────────────────────────

type SavedConfig = {
  columns: ColumnDef[];
  style: InvoiceStyleKey;
};

export async function loadColumnConfig(
  schemaName: string
): Promise<{ columns: ColumnDef[]; style: InvoiceStyleKey }> {
  try {
    const ps = await fyo.doc.getDoc(ModelNameEnum.PrintSettings);
    const raw = ps.get('columnConfig') as string | undefined;
    
    let all: Record<string, SavedConfig> = {};
    if (raw) {
      try {
        all = JSON.parse(raw) as Record<string, SavedConfig>;
      } catch {}
    }
    

    const saved = all[schemaName];
    if (!saved) {
      return { columns: DEFAULT_COLUMNS.map(c => ({ ...c })), style: 'Classic' };
    }
    let style = saved.style ?? 'Classic';
    if ((style as string) === 'Amazon') {
      style = 'Modern';
    }
    return {
      columns: saved.columns ?? DEFAULT_COLUMNS.map(c => ({ ...c })),
      style,
    };
  } catch {
    return { columns: DEFAULT_COLUMNS.map(c => ({ ...c })), style: 'Classic' };
  }
}

export async function saveColumnConfig(
  schemaName: string,
  columns: ColumnDef[],
  style: InvoiceStyleKey
): Promise<void> {
  try {
    const ps = await fyo.doc.getDoc(ModelNameEnum.PrintSettings);
    const raw = (ps.get('columnConfig') as string | undefined) ?? '{}';
    const all = JSON.parse(raw) as Record<string, SavedConfig>;
    all[schemaName] = { columns, style };
    await ps.set('columnConfig', JSON.stringify(all));
    await ps.sync();



    showToast({ message: t`Layout saved`, type: 'success' });
  } catch {
    showToast({ message: t`Save failed`, type: 'error' });
  }
}

// ─── pdfmake table layouts ────────────────────────────────────────────────────

function getBorderLayout(primary: string): CustomTableLayout {
  return {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
    vLineWidth: () => 0.5,
    hLineColor: () => primary,
    vLineColor: () => '#cccccc',
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  };
}

function getLightLinesLayout(primary: string): CustomTableLayout {
  return {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1.5 : i === 1 ? 1 : 0.3),
    vLineWidth: () => 0,
    hLineColor: (i) => (i === 0 || i === 1 ? primary : '#e5e7eb'),
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  };
}

function getThermalLayout(): CustomTableLayout {
  return {
    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0),
    vLineWidth: () => 0,
    hLineColor: () => '#000000',
    paddingLeft: () => 2,
    paddingRight: () => 2,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  };
}

function getModernLayout(): CustomTableLayout {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function cellVal(row: Record<string, unknown>, fieldname: string, idx: number): string {
  if (fieldname === 'idx') return String(idx + 1);
  const v = row[fieldname];
  if (v === null || v === undefined) return '';
  return String(v);
}

function str(v: unknown): string { return v ? String(v) : ''; }

// ─── Core doc builder ─────────────────────────────────────────────────────────

export function buildDocDefinition(
  values: PdfInvoiceValues,
  columns: ColumnDef[],
  styleKey: InvoiceStyleKey = 'Classic',
  showPageNumbers: boolean = true
): TDocumentDefinitions {
  const preset = STYLE_PRESETS[styleKey];
  const doc = values.doc;
  const print = values.print;

  // ── Respect PrintSettings fields; fall back to preset defaults ──
  const primaryColor  = (print.color  as string | undefined) || preset.primaryColor;
  const accentColor   = preset.accentColor;   // accent is always preset-defined
  const headerTextColor = preset.headerTextColor;
  const { pageSize, pageMargins, compactItems } = preset;

  // PrintSettings display flags
  const showAmountInWords = (print.amountInWords as boolean | undefined) ?? true;
  const showDescription   = (print.displayDescription   as boolean | undefined) ?? false;
  const showLogo          = (print.displayLogo           as boolean | undefined) ?? false;
  const isPOS   = styleKey === 'POS';
  const printFont         = (print.font                  as string | undefined) || (isPOS ? 'Figtree' : 'Roboto');

  // Auto-include description column if enabled in PrintSettings and not already visible
  const visibleCols = columns
    .filter(c => c.visible)
    .filter(c => c.fieldname !== 'description' || showDescription);

  // If showDescription is on but description col is not in columns, inject it after 'item'
  const hasDescript = columns.some(c => c.fieldname === 'description' && c.visible);
  const effectiveCols =
    showDescription && !hasDescript
      ? [
          ...visibleCols.slice(0, visibleCols.findIndex(c => c.fieldname === 'item') + 1),
          { fieldname: 'description', label: 'Description', width: '*', align: 'left' as const, visible: true },
          ...visibleCols.slice(visibleCols.findIndex(c => c.fieldname === 'item') + 1),
        ]
      : visibleCols;

  const items = (doc.items as Record<string, unknown>[]) ?? [];
  const taxes = (doc.taxes as { account: string; amount: string }[]) ?? [];

  const isQuote = styleKey === 'Quote';
  const isModern = styleKey === 'Modern';

  const bodyStyle: Style = {
    font: printFont,
    fontSize: isPOS ? 8 : 9,
  };

  if (isPOS) {
    const headerStack: Content[] = [];
    if (showLogo && print.logo) {
      headerStack.push({ image: str(print.logo), width: 80, alignment: 'center' as const, margin: [0, 0, 0, 4] });
    }
    headerStack.push({ text: str(print.companyName), bold: true, fontSize: 13, alignment: 'center' as const, color: primaryColor, margin: [0, 2, 0, 2] });
    if (print.address) {
      headerStack.push({ text: str((print.links as any)?.address?.addressDisplay ?? print.address), fontSize: 9, alignment: 'center' as const, margin: [0, 1, 0, 1] });
    }
    if (print.phone) {
      headerStack.push({ text: str(print.phone), fontSize: 8, alignment: 'center' as const });
    }
    if (print.email) {
      headerStack.push({ text: str(print.email), fontSize: 8, alignment: 'center' as const });
    }
    headerStack.push({ text: 'Invoice', bold: true, fontSize: 13, alignment: 'center' as const, margin: [0, 6, 0, 4] });
    headerStack.push({
      table: {
        widths: [55, 5, '*'],
        body: [
          [{ text: 'Invoice No', bold: true, fontSize: 8.5 }, { text: ':', fontSize: 8.5 }, { text: str(doc.name), fontSize: 8.5 }],
          [{ text: 'Customer', bold: true, fontSize: 8.5 }, { text: ':', fontSize: 8.5 }, { text: str(doc.party), fontSize: 8.5 }],
          [{ text: 'Date', bold: true, fontSize: 8.5 }, { text: ':', fontSize: 8.5 }, { text: str(doc.date), fontSize: 8.5 }],
        ]
      },
      layout: 'noBorders' as const,
      margin: [2, 2, 2, 6]
    });

    const posTableHeader: TableCell[] = [
      { text: t`SI`, bold: true, fontSize: 8 },
      { text: t`Item`, bold: true, fontSize: 8 },
      { text: t`Qty`, bold: true, fontSize: 8 },
      { text: t`Price`, bold: true, fontSize: 8, alignment: 'right' as const },
      { text: t`Amount`, bold: true, fontSize: 8, alignment: 'right' as const },
    ];

    const posTableRows: TableCell[][] = items.map((row, index) => [
      { text: String(index + 1), fontSize: 8, alignment: 'left' as const },
      { text: str(row.item), fontSize: 8, alignment: 'left' as const },
      { text: str(row.quantity ?? row.qty ?? ''), fontSize: 8, alignment: 'left' as const },
      { text: str(row.rate), fontSize: 8, alignment: 'right' as const },
      { text: str(row.amount), fontSize: 8, alignment: 'right' as const },
    ]);

    const itemsTable: Content = {
      table: {
        headerRows: 1,
        widths: [14, '*', 'auto', 'auto', 'auto'],
        body: [posTableHeader, ...posTableRows]
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0),
        vLineWidth: () => 0,
        hLineColor: () => '#000000',
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 4, 0, 4]
    };

    const netTotalSection: Content = {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: t`Total`, fontSize: 8.5 },
            { text: str(doc.netTotal), fontSize: 8.5, alignment: 'right' as const }
          ]
        ]
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.8 : 0),
        vLineWidth: () => 0,
        hLineColor: () => '#000000',
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 4, 0, 4]
    };

    const netTotalToPaySection: Content = {
      columns: [
        { text: 'Net Total To Pay', bold: true, fontSize: 10 },
        { text: str(doc.grandTotal), bold: true, fontSize: 11, alignment: 'right' as const }
      ],
      margin: [0, 6, 0, 6]
    };

    const taxSummaryBlock: Content[] = [];
    if (taxes.length) {
      taxSummaryBlock.push({
        table: {
          widths: ['*'],
          body: [
            [{ text: t`Tax Summary`, bold: true, fontSize: 10, alignment: 'center' as const }]
          ]
        },
        layout: {
          hLineWidth: (i: number) => i === 0 ? 0.8 : 0,
          vLineWidth: () => 0,
          hLineColor: () => '#000000',
          paddingBottom: () => 4
        },
        margin: [0, 8, 0, 4]
      });

      taxSummaryBlock.push({
        columns: [
          { text: 'Total Ex.Tax', fontSize: 8.5, margin: [10, 0, 0, 0] },
          { text: str(doc.subTotal), fontSize: 8.5, alignment: 'right' as const }
        ],
        margin: [0, 2, 0, 2]
      });

      taxes.forEach(tax => {
        taxSummaryBlock.push({
          columns: [
            { text: str(tax.account), fontSize: 8.5, margin: [10, 0, 0, 0] },
            { text: str(tax.amount), fontSize: 8.5, alignment: 'right' as const }
          ],
          margin: [0, 2, 0, 2]
        });
      });
    }

    const paymentTableBody: TableCell[][] = [
      [
        { text: t`Payment`, bold: true, fontSize: 8 },
        { text: t`Tendered`, bold: true, fontSize: 8, alignment: 'right' as const },
        { text: t`Balance`, bold: true, fontSize: 8, alignment: 'right' as const }
      ],
      [
        { text: t`Discount`, fontSize: 8 },
        { text: str(doc.totalDiscount ? doc.totalDiscount : '00.00'), fontSize: 8, alignment: 'right' as const },
        { text: '', fontSize: 8 }
      ]
    ];

    const paymentDetails = (doc.paymentDetails as { paymentMethod: string; amount: string; outstandingAmount: string }[]) ?? [];
    paymentDetails.forEach(row => {
      paymentTableBody.push([
        { text: str(row.paymentMethod), fontSize: 8 },
        { text: str(row.amount), fontSize: 8, alignment: 'right' as const },
        { text: str(row.outstandingAmount), fontSize: 8, alignment: 'right' as const }
      ]);
    });

    const paymentBlock: Content = {
      table: {
        widths: ['*', 'auto', 'auto'],
        body: paymentTableBody
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0),
        vLineWidth: () => 0,
        hLineColor: () => '#000000',
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 8, 0, 8]
    };

    const footerBlock: Content = { text: '***** Thank You Visit Again *****', fontSize: 10, alignment: 'center' as const, margin: [0, 12, 0, 15] };

    return {
      info: { title: str(doc.name) },
      pageSize,
      pageOrientation: 'portrait',
      pageMargins,
      content: [
        ...headerStack,
        itemsTable,
        netTotalSection,
        netTotalToPaySection,
        ...taxSummaryBlock,
        paymentBlock,
        footerBlock
      ],
      defaultStyle: bodyStyle,
    };
  }

  // ── Table data ──
  const tableHeader: TableCell[] = effectiveCols.map(c => ({
    text: c.label,
    bold: true,
    fontSize: compactItems ? 7 : 8,
    color: isModern ? '#000000' : headerTextColor,
    fillColor: isModern ? '#f3f4f6' : primaryColor,
    alignment: c.align,
  }));

  const tableRows: TableCell[][] = items.map((row, idx) =>
    effectiveCols.map(c => ({
      text: cellVal(row, c.fieldname, idx),
      fontSize: compactItems ? 7 : 8.5,
      alignment: c.align,
      fillColor: idx % 2 === 1 && !isPOS && !isModern ? '#f9fafb' : undefined,
    }))
  );

  const lastColSpan = Math.max(1, effectiveCols.length - 1);
  const totalRow: TableCell[] = [
    {
      text: isQuote ? 'ESTIMATED TOTAL' : 'TOTAL',
      bold: true,
      fontSize: compactItems ? 8 : 9,
      colSpan: lastColSpan,
      alignment: 'right',
      fillColor: isModern ? '#f3f4f6' : accentColor,
      color: '#000000',
    },
    ...Array(lastColSpan - 1).fill({}),
    {
      text: str(doc.grandTotal),
      bold: true,
      fontSize: compactItems ? 8 : 9,
      alignment: 'right',
      fillColor: isModern ? '#f3f4f6' : accentColor,
      color: '#000000',
    },
  ];

  const colWidths = effectiveCols.map(c => {
    if (c.width === '*' || c.width === 'auto') return c.width as '*' | 'auto';
    const n = parseFloat(c.width);
    return isNaN(n) ? c.width : n;
  });

  // ── Resolve table layout ──
  let tableLayoutName: string | CustomTableLayout;
  if (isModern) {
    tableLayoutName = getModernLayout();
  } else {
    switch (preset.tableLayout) {
      case 'bordered':    tableLayoutName = getBorderLayout(primaryColor); break;
      case 'lightLines':  tableLayoutName = getLightLinesLayout(primaryColor); break;
      case 'noBorders':   tableLayoutName = 'noBorders'; break;
      case 'thermal':     tableLayoutName = getThermalLayout(); break;
      default:            tableLayoutName = 'lightHorizontalLines';
    }
  }

  // ── Header block: use showLogo from PrintSettings ──
  const logoBlock: Content = (showLogo && print.logo)
    ? { image: str(print.logo), width: 80, margin: [0, 0, 0, 0] }
    : {
        text: str(print.companyName),
        fontSize: isPOS ? 12 : 18,
        bold: true,
        color: primaryColor,
      };

  const titleText = isQuote
    ? 'QUOTATION'
    : str(doc.entryLabel)?.toUpperCase() || 'INVOICE';

  const headerContent: Content = isPOS
    ? {
        stack: [
          { text: str(print.companyName), bold: true, fontSize: 11, alignment: 'center' },
          { text: titleText, fontSize: 9, alignment: 'center', margin: [0, 2, 0, 0] },
          { text: str(doc.name), fontSize: 8, alignment: 'center' },
          { text: str(doc.date), fontSize: 8, alignment: 'center', color: '#555' },
          { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 200, y2: 4, lineWidth: 0.5 }] },
        ],
        margin: [0, 0, 0, 8],
      }
    : (isModern
        ? {
            columns: [
              (showLogo && print.logo)
                ? { image: str(print.logo), width: 100, margin: [0, 0, 0, 0] }
                : { text: str(print.companyName), fontSize: 16, bold: true, color: '#000000' },
              {
                stack: [
                  { text: titleText || 'TAX INVOICE', fontSize: 14, bold: true, color: '#000000' },
                  { text: '(Original for Recipient)', fontSize: 8, color: '#555', margin: [0, 2, 0, 0] }
                ],
                alignment: 'right'
              }
            ],
            margin: [0, 0, 0, 15]
          }
        : {
            columns: [
              logoBlock,
              {
                stack: [
                  {
                    text: titleText,
                    fontSize: 16,
                    bold: true,
                    alignment: 'right',
                    color: primaryColor,
                  },
                  { text: str(doc.name), fontSize: 10, alignment: 'right', color: '#555' },
                  { text: `Date: ${str(doc.date)}`, fontSize: 8, alignment: 'right', color: '#777' },
                  isQuote
                    ? { text: `Valid Until: 30 days from issue`, fontSize: 8, alignment: 'right', color: accentColor, italics: true }
                    : null as unknown as Content,
                ].filter(Boolean) as Content[],
              },
            ],
            margin: [0, 0, 0, 10],
          }
      );

  // ── Address block ──
  const addressBlock: Content = isPOS
    ? {
        stack: [
          { text: `Bill To: ${str(doc.party)}`, fontSize: 7.5, bold: true, alignment: 'center' },
          doc.partyGSTIN ? { text: `GSTIN: ${str(doc.partyGSTIN)}`, fontSize: 7, alignment: 'center', color: '#555' } : null as unknown as Content,
        ].filter(Boolean) as Content[],
        margin: [0, 0, 0, 6],
      }
    : (isModern
        ? {
            stack: [
              {
                columns: [
                  {
                     stack: [
                       { text: 'Sold By :', bold: true, fontSize: 8 },
                       { text: str(print.companyName), fontSize: 9, bold: true, margin: [0, 2, 0, 0] },
                       { text: str((print.links as any)?.address?.addressDisplay ?? str(print.address)), fontSize: 8, color: '#333', lineHeight: 1.2 },
                       print.pan ? { text: `PAN No: ${str(print.pan)}`, fontSize: 7.5, color: '#555', margin: [0, 2, 0, 0] } : null as unknown as Content,
                       print.gstin ? { text: `GST Registration No: ${str(print.gstin)}`, fontSize: 7.5, color: '#555' } : null as unknown as Content,
                     ].filter(Boolean) as Content[],
                     width: '50%'
                  },
                  {
                     stack: [
                       { text: 'Billing Address :', bold: true, fontSize: 8 },
                       { text: str(doc.party), fontSize: 9, bold: true, margin: [0, 2, 0, 0] },
                       { text: str((doc.links as any)?.party?.links?.address?.addressDisplay ?? doc.partyAddress ?? ''), fontSize: 8, color: '#333', lineHeight: 1.2 },
                       doc.partyGSTIN ? { text: `GSTIN: ${str(doc.partyGSTIN)}`, fontSize: 7.5, color: '#555', margin: [0, 2, 0, 0] } : null as unknown as Content,
                     ].filter(Boolean) as Content[],
                     width: '50%',
                     alignment: 'right'
                  }
                ]
              },
              {
                 columns: [
                   { text: '', width: '50%' },
                   {
                     stack: [
                       { text: 'Shipping Address :', bold: true, fontSize: 8 },
                       { text: str(doc.party), fontSize: 9, bold: true, margin: [0, 2, 0, 0] },
                       { text: str((doc.links as any)?.shippingAddress?.addressDisplay ?? (doc.links as any)?.party?.links?.address?.addressDisplay ?? doc.partyAddress ?? ''), fontSize: 8, color: '#333', lineHeight: 1.2 },
                     ],
                     width: '50%',
                     alignment: 'right'
                   }
                 ],
                 margin: [0, 6, 0, 10]
              }
            ]
          }
        : {
            columns: [
              {
                stack: [
                  { text: isQuote ? 'Quotation To:' : 'Sold By:', bold: true, fontSize: 8, color: primaryColor },
                  { text: str(print.companyName), fontSize: 9, bold: true, margin: [0, 2, 0, 0] },
                  { text: str((print.links as any)?.address?.addressDisplay ?? str(print.address)), fontSize: 8, color: '#555', lineHeight: 1.3 },
                  print.gstin ? { text: `GSTIN: ${str(print.gstin)}`, fontSize: 7.5, color: '#777', margin: [0, 2, 0, 0] } : null as unknown as Content,
                  print.email ? { text: str(print.email), fontSize: 7.5, color: '#777' } : null as unknown as Content,
                  print.phone ? { text: str(print.phone), fontSize: 7.5, color: '#777' } : null as unknown as Content,
                ].filter(Boolean) as Content[],
                width: '50%',
              },
              {
                stack: [
                  { text: isQuote ? 'Quoted To:' : 'Bill To:', bold: true, fontSize: 8, color: primaryColor, alignment: 'right' },
                  { text: str(doc.party), fontSize: 9, bold: true, alignment: 'right', margin: [0, 2, 0, 0] },
                  {
                    text: str((doc.links as any)?.party?.links?.address?.addressDisplay ?? ''),
                    fontSize: 8, color: '#555', alignment: 'right', lineHeight: 1.3,
                  },
                  doc.partyGSTIN ? { text: `GSTIN: ${str(doc.partyGSTIN)}`, fontSize: 7.5, color: '#777', alignment: 'right', margin: [0, 2, 0, 0] } : null as unknown as Content,
                ].filter(Boolean) as Content[],
                width: '50%',
              },
            ],
            margin: [0, 0, 0, 12],
          }
      );

  // ── Divider ──
  const divider: Content = isPOS
    ? { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: primaryColor }], margin: [0, 0, 0, 8] }
    : {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 535, h: 4, color: primaryColor }],
        margin: [0, 0, 0, 10],
      };

  // ── Meta block (only for Modern Layout) ──
  const metaBlock: Content | null = isModern
    ? {
        stack: [
          {
            columns: [
              {
                stack: [
                  doc.orderNumber ? { text: [{ text: 'Order Number: ', bold: true }, str(doc.orderNumber)], fontSize: 8 } : null as unknown as Content,
                  { text: [{ text: 'Order Date: ', bold: true }, str(doc.date)], fontSize: 8, margin: [0, 2, 0, 0] }
                ].filter(Boolean) as Content[]
              },
              {
                stack: [
                  { text: [{ text: 'Invoice Number: ', bold: true }, str(doc.name)], fontSize: 8 },
                  { text: [{ text: 'Invoice Date: ', bold: true }, str(doc.date)], fontSize: 8, margin: [0, 2, 0, 0] }
                ],
                alignment: 'right'
              }
            ],
            margin: [0, 4, 0, 4]
          },
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, lineColor: '#dddddd' }],
            margin: [0, 2, 0, 8]
          }
        ]
      }
    : null;

  // ── Totals section ──
  const totalsRows: Content = {
    columns: [
      doc.terms
        ? { stack: [{ text: 'Notes:', bold: true, fontSize: 8 }, { text: str(doc.terms), fontSize: 8, color: '#555', lineHeight: 1.3 }], width: '50%' }
        : { text: '', width: '50%' },
      {
        stack: [
          { text: `Total: ${str(doc.netTotal)}`, fontSize: 8.5, alignment: 'right' },
          ...taxes.map(tx => ({ text: `${tx.account}: ${tx.amount}`, fontSize: 8, alignment: 'right' as const, color: '#555' })),
          print.roundOffGrandTotal && doc.hasRoundOff
            ? { text: `Round Off: ${str(doc.roundOff)}`, fontSize: 8, alignment: 'right' as const, color: '#555' }
            : null as unknown as Content,
          {
             text: `${isQuote ? 'Estimated Total' : 'Grand Total'}: ${str(print.roundOffGrandTotal ? doc.roundedGrandTotal : doc.grandTotal)}`,
             bold: true, fontSize: 11, alignment: 'right',
             color: isModern ? '#000000' : primaryColor,
             margin: [0, 4, 0, 0] as [number, number, number, number],
          },
        ].filter(Boolean) as Content[],
        width: '50%',
      },
    ],
    margin: [0, 8, 0, 0] as [number, number, number, number],
  };

  // ── Amount in words (gated by PrintSettings.displayAmountInWords) ──
  const wordsBlock: Content | null = (showAmountInWords && doc.grandTotalInWords)
    ? (isModern
        ? {
            table: {
              widths: ['*'],
              body: [[
                {
                  stack: [
                    { text: 'Amount in Words:', bold: true, fontSize: 8 },
                    { text: str(doc.grandTotalInWords), fontSize: 8 }
                  ],
                  margin: [2, 2, 2, 2]
                }
              ]]
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000'
            },
            margin: [0, 8, 0, 8]
          }
        : {
            text: [{ text: 'Amount in Words: ', bold: true }, str(doc.grandTotalInWords)],
            fontSize: 7.5, color: '#555', margin: [0, 6, 0, 0],
          })
    : null;

  const signatureWidth = Number(print.signatureSize) || 80;
  const sealWidth = Number(print.sealSize) || 50;

  // ── Signature / footer ──
    // ── Deduped signature and seal block ──
  const signatureAndSealBlock: Content | null = (print.displaySignature && print.signature) || (print.displaySeal && print.seal)
    ? {
        columns: [
          print.displaySignature && print.signature
            ? {
                stack: [
                  { image: str(print.signature), width: signatureWidth, alignment: 'center' as const },
                  { text: 'Signature', fontSize: 7, color: '#777', alignment: 'center' as const, margin: [0, 2, 0, 0] }
                ]
              }
            : { text: '' },
          print.displaySeal && print.seal
            ? {
                stack: [
                  { image: str(print.seal), width: sealWidth, alignment: 'center' as const },
                  { text: 'Seal', fontSize: 7, color: '#777', alignment: 'center' as const, margin: [0, 2, 0, 0] }
                ]
              }
            : { text: '' }
        ],
        margin: [0, 0, 0, 8]
      }
    : null;

  const sigSealPos = (print.sigSealPosition as string | undefined) || 'before_terms';
  const sigSealBeforeTerms = sigSealPos === 'before_terms' ? signatureAndSealBlock : null;
  const sigSealAfterTerms = sigSealPos === 'after_terms' ? signatureAndSealBlock : null;
  const sigSealInSignatory = sigSealPos === 'authorized_signatory' ? signatureAndSealBlock : null;

  const footerBlock: Content = isPOS
    ? {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 200, y2: 4, lineWidth: 0.5 }] },
          { text: 'Thank you for your business!', fontSize: 8, alignment: 'center', italics: true, margin: [0, 4, 0, 0] },
          print.termsAndConditions ? { text: str(print.termsAndConditions), fontSize: 7, alignment: 'center', color: '#555', margin: [0, 2, 0, 0] } : null as unknown as Content,
        ].filter(Boolean) as Content[],
        margin: [0, 8, 0, 0],
      }
    : (isModern
        ? {
             columns: [
               {
                 stack: [
                   sigSealBeforeTerms,
                   print.displaytermsandconditions && print.termsAndConditions ? {
                     stack: [
                       { text: 'Terms & Conditions:', bold: true, fontSize: 7.5, margin: [0, 4, 0, 2] },
                       { text: str(print.termsAndConditions), fontSize: 7, color: '#777', lineHeight: 1.3 }
                     ]
                   } : null as unknown as Content,
                   sigSealAfterTerms,
                 ].filter(Boolean) as Content[],
                 width: '55%',
               },
               {
                 table: {
                   widths: ['*'],
                   body: [[
                     {
                       stack: [
                          { text: `For ${str(print.companyName)}:`, bold: true, fontSize: 8, alignment: 'left' },
                          sigSealInSignatory
                            ? {
                                columns: [
                                  print.displaySignature && print.signature
                                    ? { image: str(print.signature), width: signatureWidth * 0.75, alignment: 'center' as const }
                                    : { text: '' },
                                  print.displaySeal && print.seal
                                    ? { image: str(print.seal), width: sealWidth * 0.75, alignment: 'center' as const }
                                    : { text: '' }
                                ],
                                margin: [0, 4, 0, 4]
                              }
                            : { text: '\n\n\n', fontSize: 8 },
                          { text: 'Authorized Signatory', fontSize: 8, alignment: 'right', bold: true }
                       ]
                     }
                   ]]
                 },
                 layout: {
                   hLineWidth: () => 0.5,
                   vLineWidth: () => 0.5,
                   hLineColor: () => '#000000',
                   vLineColor: () => '#000000'
                 },
                 width: '40%',
               }
             ],
             margin: [0, 16, 0, 0] as [number, number, number, number],
           }
        : {
             columns: [
               {
                 stack: [
                   sigSealBeforeTerms,
                   print.termsAndConditions ? {
                     stack: [
                       { text: 'Terms & Conditions:', bold: true, fontSize: 7.5, margin: [0, 4, 0, 2] },
                       { text: str(print.termsAndConditions), fontSize: 7, color: '#777', lineHeight: 1.3 }
                     ]
                   } : null as unknown as Content,
                   sigSealAfterTerms,
                 ].filter(Boolean) as Content[],
                 width: '60%',
               },
               {
                 stack: [
                   { text: `For ${str(print.companyName)}`, bold: true, fontSize: 8, alignment: 'right' },
                   sigSealInSignatory
                     ? {
                         columns: [
                           { text: '' },
                           print.displaySignature && print.signature
                             ? { image: str(print.signature), width: signatureWidth * 0.75, alignment: 'right' as const }
                             : { text: '' },
                           print.displaySeal && print.seal
                             ? { image: str(print.seal), width: sealWidth * 0.75, alignment: 'right' as const }
                             : { text: '' }
                         ],
                         margin: [0, 4, 0, 4]
                       }
                     : { text: '\n\n\n', fontSize: 8 },
                   { text: 'Authorized Signatory', fontSize: 8, alignment: 'right', color: '#555' },
                 ].filter(Boolean) as Content[],
                 width: '40%',
               },
             ],
             margin: [0, 16, 0, 0] as [number, number, number, number],
           }
        );

  // ── Assemble ──
  const def: TDocumentDefinitions = {
    info: { title: str(doc.name) },
    pageSize,
    pageOrientation: 'portrait',
    pageMargins: [pageMargins[0], pageMargins[1], pageMargins[2], pageMargins[3] + 15],
    content: [
      headerContent,
      ...(!isPOS && !isModern ? [divider] : []),
      addressBlock,
      isModern ? metaBlock : null,
      isPOS || isModern ? null : {
        columns: [
          { text: `Invoice No: ${str(doc.name)}`, fontSize: 8, color: '#555' },
          { text: str(doc.date), fontSize: 8, color: '#555', alignment: 'right' },
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },
      {
        table: {
          headerRows: 1,
          widths: colWidths,
          body: [tableHeader, ...tableRows],
        },
        layout: tableLayoutName,
      },
      wordsBlock,
      totalsRows,
      footerBlock,
    ].filter(Boolean) as Content[],
    defaultStyle: bodyStyle,
  };

  if (showPageNumbers && !isPOS) {
    def.footer = (currentPage: number, pageCount: number) => {
      return {
        text: `Page ${currentPage} of ${pageCount}`,
        fontSize: 7.5,
        alignment: 'right' as const,
        margin: [0, 0, pageMargins[2], 0],
      };
    };
  }

  return def;
}

// ─── Download / Print ─────────────────────────────────────────────────────────

let cachedPdfMake: any = null;

export async function getPdfMake() {
  if (cachedPdfMake) {
    return cachedPdfMake;
  }
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
  (pdfMake as any).vfs =
    (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs || pdfFonts;

  if (!pdfMake.fonts) {
    pdfMake.fonts = {};
  }
  if (!pdfMake.fonts.Roboto) {
    pdfMake.fonts.Roboto = {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    };
  }

  const vfsKeys = Object.keys((pdfMake as any).vfs || {});

  const hasCourier = vfsKeys.some(k => k.toLowerCase().includes('courier'));
  pdfMake.fonts.Courier = hasCourier ? {
    normal: vfsKeys.find(k => k.toLowerCase().includes('courier') && k.toLowerCase().includes('regular')) || 'Roboto-Regular.ttf',
    bold: vfsKeys.find(k => k.toLowerCase().includes('courier') && k.toLowerCase().includes('bold')) || 'Roboto-Medium.ttf',
    italics: vfsKeys.find(k => k.toLowerCase().includes('courier') && k.toLowerCase().includes('italic')) || 'Roboto-Italic.ttf',
    bolditalics: vfsKeys.find(k => k.toLowerCase().includes('courier') && k.toLowerCase().includes('bolditalic')) || 'Roboto-MediumItalic.ttf',
  } : pdfMake.fonts.Roboto;

  const hasTimes = vfsKeys.some(k => k.toLowerCase().includes('times'));
  pdfMake.fonts['Times New Roman'] = hasTimes ? {
    normal: vfsKeys.find(k => k.toLowerCase().includes('times') && k.toLowerCase().includes('regular')) || 'Roboto-Regular.ttf',
    bold: vfsKeys.find(k => k.toLowerCase().includes('times') && k.toLowerCase().includes('bold')) || 'Roboto-Medium.ttf',
    italics: vfsKeys.find(k => k.toLowerCase().includes('times') && k.toLowerCase().includes('italic')) || 'Roboto-Italic.ttf',
    bolditalics: vfsKeys.find(k => k.toLowerCase().includes('times') && k.toLowerCase().includes('bolditalic')) || 'Roboto-MediumItalic.ttf',
  } : pdfMake.fonts.Roboto;

  const hasArial = vfsKeys.some(k => k.toLowerCase().includes('arial'));
  pdfMake.fonts.Arial = hasArial ? {
    normal: vfsKeys.find(k => k.toLowerCase().includes('arial') && k.toLowerCase().includes('regular')) || 'Roboto-Regular.ttf',
    bold: vfsKeys.find(k => k.toLowerCase().includes('arial') && k.toLowerCase().includes('bold')) || 'Roboto-Medium.ttf',
    italics: vfsKeys.find(k => k.toLowerCase().includes('arial') && k.toLowerCase().includes('italic')) || 'Roboto-Italic.ttf',
    bolditalics: vfsKeys.find(k => k.toLowerCase().includes('arial') && k.toLowerCase().includes('bolditalic')) || 'Roboto-MediumItalic.ttf',
  } : pdfMake.fonts.Roboto;

  const hasFigtree = vfsKeys.some(k => k.toLowerCase().includes('figtree'));
  if (hasFigtree) {
    pdfMake.fonts.Figtree = {
      normal: vfsKeys.find(k => k.toLowerCase().includes('figtree') && k.toLowerCase().includes('regular')) || 'Roboto-Regular.ttf',
      bold: vfsKeys.find(k => k.toLowerCase().includes('figtree') && (k.toLowerCase().includes('medium') || k.toLowerCase().includes('bold'))) || 'Roboto-Medium.ttf',
      italics: vfsKeys.find(k => k.toLowerCase().includes('figtree') && k.toLowerCase().includes('italic')) || 'Roboto-Italic.ttf',
      bolditalics: vfsKeys.find(k => k.toLowerCase().includes('figtree') && k.toLowerCase().includes('bolditalic')) || 'Roboto-MediumItalic.ttf',
    };
  } else {
    pdfMake.fonts.Figtree = pdfMake.fonts.Roboto;
  }

  cachedPdfMake = pdfMake;
  return pdfMake;
}

export async function downloadInvoicePdf(
  name: string,
  values: PdfInvoiceValues,
  columns: ColumnDef[],
  style: InvoiceStyleKey = 'Classic',
  showPageNumbers: boolean = true
): Promise<void> {
  try {
    const pdfMake = await getPdfMake();
    const def = buildDocDefinition(values, columns, style, showPageNumbers);
    
    const { getSavePath } = await import('src/utils/ui');
    const { canceled, filePath } = await getSavePath(name, 'pdf');
    if (canceled || !filePath) {
      return;
    }

    const pdfBuffer = await pdfMake.createPdf(def).getBuffer();
    const buffer = new Uint8Array(pdfBuffer);

    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(filePath, buffer);

    const { showExportInFolder } = await import('src/utils/ui');
    showExportInFolder(t`PDF Saved`, filePath);
  } catch (e) {
    console.error(e);
    showToast({ message: t`PDF generation failed`, type: 'error' });
  }
}

export async function printInvoicePdf(
  _name: string,
  values: PdfInvoiceValues,
  columns: ColumnDef[],
  style: InvoiceStyleKey = 'Classic',
  showPageNumbers: boolean = true
): Promise<void> {
  try {
    const pdfMake = await getPdfMake();
    const def = buildDocDefinition(values, columns, style, showPageNumbers);
    
    const pdfBuffer = await pdfMake.createPdf(def).getBuffer();
    const buffer = new Uint8Array(pdfBuffer);
    const { tempDir, join } = await import('@tauri-apps/api/path');
    const tempDirPath = await tempDir();
    const sanitizedName = _name.replace(/[^a-zA-Z0-9-_ ]/g, '_') || 'invoice';
    const filePath = await join(tempDirPath, `${sanitizedName}.pdf`);

    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(filePath, buffer);

    const { openPath } = await import('@tauri-apps/plugin-opener');
    await openPath(filePath);
  } catch (e) {
    console.error(e);
    showToast({ message: t`Print failed`, type: 'error' });
  }
}
