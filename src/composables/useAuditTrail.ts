import { ref, computed, onMounted } from 'vue';
import { useApp } from 'src/composables/useApp';
import { getBgTextColorClass } from 'src/utils/colors';

export interface AuditLogEntry {
  name: string;
  timestamp: string;
  action: string;
  documentType: string;
  documentName: string;
  user: string;
  changes: string;
  checksum: string;
}

export function useAuditTrail() {
  const { fyo, t } = useApp();

  const loading = ref(false);
  const logs = ref<AuditLogEntry[]>([]);
  const selectedLog = ref<AuditLogEntry | null>(null);

  const pageStart = ref(0);
  const pageEnd = ref(50);

  const filters = ref({
    fromDate: '',
    toDate: '',
    action: '',
    documentType: '',
    search: '',
  });

  const sortState = ref<{ field: string; dir: 'asc' | 'desc' }>({
    field: 'timestamp',
    dir: 'desc',
  });

  // ── Grid Columns Definition ───────────────────────────────────────────────────
  const gridTemplateColumns =
    'minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 2fr) minmax(0, 0.8fr)';

  // ── Filter Schema Definitions for FormControl ──────────────────────────────────
  const fromDateDf = {
    fieldname: 'fromDate',
    label: t`From Date`,
    fieldtype: 'Datetime',
  };

  const toDateDf = {
    fieldname: 'toDate',
    label: t`To Date`,
    fieldtype: 'Datetime',
  };

  const actionDf = computed(() => ({
    fieldname: 'action',
    label: t`Action`,
    fieldtype: 'Select',
    options: [
      { value: '', label: t`All Actions` },
      { value: 'Create', label: t`Create` },
      { value: 'Update', label: t`Update` },
      { value: 'Delete', label: t`Delete` },
      { value: 'Submit', label: t`Submit` },
      { value: 'Cancel', label: t`Cancel` },
      { value: 'Rename', label: t`Rename` },
      { value: 'DB_Opened', label: t`DB_Opened` },
      { value: 'DB_Created', label: t`DB_Created` },
      { value: 'DB_Closed', label: t`DB_Closed` },
    ],
  }));

  const documentTypeDf = computed(() => ({
    fieldname: 'documentType',
    label: t`Document Type`,
    fieldtype: 'Select',
    options: [
      { value: '', label: t`All Types` },
      ...documentTypes.value.map((dt) => ({ value: dt, label: dt })),
    ],
  }));

  const searchDf = {
    fieldname: 'search',
    label: t`Search Document`,
    fieldtype: 'Data',
    placeholder: t`Invoice #, Party name...`,
  };

  const documentTypes = computed(() => {
    const types = new Set(logs.value.map((l) => l.documentType));
    return [...types].sort();
  });

  const filteredLogs = computed(() => {
    let result = [...logs.value];

    if (filters.value.fromDate) {
      const from = new Date(filters.value.fromDate).getTime();
      result = result.filter((l) => new Date(l.timestamp).getTime() >= from);
    }
    if (filters.value.toDate) {
      const to = new Date(filters.value.toDate).getTime();
      result = result.filter((l) => new Date(l.timestamp).getTime() <= to);
    }
    if (filters.value.action) {
      result = result.filter((l) => l.action === filters.value.action);
    }
    if (filters.value.documentType) {
      result = result.filter(
        (l) => l.documentType === filters.value.documentType
      );
    }
    if (filters.value.search) {
      const q = filters.value.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.documentName?.toLowerCase().includes(q) ||
          l.documentType?.toLowerCase().includes(q) ||
          l.user?.toLowerCase().includes(q)
      );
    }

    // sort
    const { field, dir } = sortState.value;
    result.sort((a, b) => {
      const av = (a as any)[field] ?? '';
      const bv = (b as any)[field] ?? '';
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  });

  const paginatedLogs = computed(() =>
    filteredLogs.value.slice(pageStart.value, pageEnd.value)
  );

  const stats = computed(() => {
    const all = filteredLogs.value;
    return [
      { label: t`Total Entries`, value: all.length.toLocaleString() },
      {
        label: t`Create`,
        value: all.filter((l) => l.action === 'Create').length,
      },
      {
        label: t`Update`,
        value: all.filter((l) => l.action === 'Update').length,
      },
      {
        label: t`Delete`,
        value: all.filter((l) => l.action === 'Delete').length,
      },
      {
        label: t`System Events`,
        value: all.filter((l) =>
          ['DB_Opened', 'DB_Created', 'DB_Closed'].includes(l.action)
        ).length,
      },
    ];
  });

  async function loadLogs() {
    loading.value = true;
    try {
      const rows = await fyo.db.getAll('AuditLog', {
        fields: [
          'name',
          'timestamp',
          'action',
          'documentType',
          'documentName',
          'user',
          'changes',
          'checksum',
        ],
        orderBy: 'timestamp',
        order: 'desc',
        limit: 5000,
      });
      logs.value = rows as unknown as AuditLogEntry[];
    } catch {
      logs.value = [];
    } finally {
      loading.value = false;
    }
  }

  function onFilterChange() {
    pageStart.value = 0;
    pageEnd.value = 50;
  }

  function handleSearchInput(e: Event) {
    filters.value.search = (e.target as HTMLInputElement).value;
    onFilterChange();
  }

  function clearFilters() {
    filters.value = {
      fromDate: '',
      toDate: '',
      action: '',
      documentType: '',
      search: '',
    };
    onFilterChange();
  }

  function sortBy(field: string) {
    if (sortState.value.field === field) {
      sortState.value.dir = sortState.value.dir === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.value = { field, dir: 'desc' };
    }
  }

  function sortIcon(field: string) {
    if (sortState.value.field !== field) return '↕';
    return sortState.value.dir === 'asc' ? '↑' : '↓';
  }

  function openDetail(log: AuditLogEntry) {
    selectedLog.value = log;
  }

  function formatDate(ts: string) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(ts: string) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  function formatFullDateTime(ts: string) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  // Helper for truncation
  function truncateChanges(changes: string) {
    if (!changes) return '';
    return changes.length > 60 ? changes.substring(0, 60) + '…' : changes;
  }

  function formatChanges(changes: string) {
    try {
      return JSON.stringify(JSON.parse(changes), null, 2);
    } catch {
      return changes;
    }
  }

  function setPageIndices({ start, end }: { start: number; end: number }) {
    pageStart.value = start;
    pageEnd.value = end;
  }

  function actionBadgeClass(action: string) {
    const act = action?.toLowerCase() || '';
    let color = 'gray';
    if (act === 'create' || act === 'db_created') color = 'green';
    else if (act === 'update') color = 'blue';
    else if (act === 'delete' || act === 'db_closed') color = 'red';
    else if (act === 'submit') color = 'blue';
    else if (act === 'cancel') color = 'red';
    else if (act === 'rename') color = 'purple';
    else if (act === 'db_opened') color = 'orange';
    return getBgTextColorClass(color);
  }

  function exportCsv() {
    const headers = [
      'Entry No.',
      'Timestamp',
      'Action',
      'Document Type',
      'Document Name',
      'User',
      'Integrity Hash',
    ];
    const rows = filteredLogs.value.map((l) => [
      l.name,
      l.timestamp,
      l.action,
      l.documentType,
      l.documentName,
      l.user,
      l.checksum,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  onMounted(() => {
    loadLogs();
  });

  return {
    t,
    loading,
    logs,
    selectedLog,
    pageStart,
    pageEnd,
    filters,
    sortState,
    gridTemplateColumns,
    fromDateDf,
    toDateDf,
    actionDf,
    documentTypeDf,
    searchDf,
    documentTypes,
    filteredLogs,
    paginatedLogs,
    stats,
    loadLogs,
    onFilterChange,
    handleSearchInput,
    clearFilters,
    sortBy,
    sortIcon,
    openDetail,
    formatDate,
    formatTime,
    formatFullDateTime,
    truncateChanges,
    formatChanges,
    setPageIndices,
    actionBadgeClass,
    exportCsv,
    printReport,
  };
}
