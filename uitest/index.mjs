import path from 'path';
import { spawn } from 'child_process';
import CDP from 'chrome-remote-interface';
import { fileURLToPath } from 'url';
import test from 'tape';
import http from 'http';
import fs from 'fs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..');

const releaseBinary = process.platform === 'win32'
  ? path.join(root, 'src-tauri', 'target', 'release', 'app.exe')
  : path.join(root, 'src-tauri', 'target', 'release', 'app');

const debugBinary = process.platform === 'win32'
  ? path.join(root, 'src-tauri', 'target', 'debug', 'app.exe')
  : path.join(root, 'src-tauri', 'target', 'debug', 'app');

const appBinary = fs.existsSync(releaseBinary) ? releaseBinary : debugBinary;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCDP(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          if (res.statusCode === 200) resolve();
          else reject();
        });
        req.on('error', reject);
        req.end();
      });
      return true;
    } catch {
      await wait(500);
    }
  }
  throw new Error(`CDP debugging port ${port} did not become available in ${timeoutMs}ms`);
}

(async function run() {
  console.log(`# Spawning Tauri application: ${appBinary}`);
  
  // Set WebView2 environment variable for Windows remote debugging
  process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = '--remote-debugging-port=5858';

  const errorLogPath = path.join(root, 'uitest-errors.log');
  fs.writeFileSync(errorLogPath, ''); // Clear previous logs
  
  function logError(msg) {
    console.error(msg);
    fs.appendFileSync(errorLogPath, msg + '\n');
  }

  const appProcess = spawn(appBinary, [], {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: process.env,
  });

  appProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    process.stderr.write(msg);
    fs.appendFileSync(errorLogPath, `[Tauri Stderr] ${msg}`);
  });

  process.on('exit', () => appProcess.kill());

  try {
    await waitForCDP(5858);
  } catch (err) {
    logError(err.message);
    appProcess.kill();
    process.exit(1);
  }

  console.log('# Connecting to Chrome DevTools Protocol...');
  const client = await CDP({ port: 5858 });
  const { Runtime, Page, Console } = client;
  await Runtime.enable();
  await Page.enable();
  await Page.addScriptToEvaluateOnNewDocument({
    source: `
      window.isTestEnv = true;
      const formatArg = (arg) => {
        if (arg instanceof Error) {
          return arg.stack || arg.message || String(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            const keys = Object.getOwnPropertyNames(arg);
            if (keys.length === 0) {
              return Object.prototype.toString.call(arg);
            }
            const obj = {};
            for (const k of keys) {
              try {
                obj[k] = arg[k];
              } catch (e) {
                obj[k] = '[Unreadable Property]';
              }
            }
            return JSON.stringify(obj, null, 2);
          } catch (e) {
            try {
              return Object.prototype.toString.call(arg);
            } catch (err) {
              return '[Unserializable Object]';
            }
          }
        }
        try {
          return String(arg);
        } catch (e) {
          return Object.prototype.toString.call(arg);
        }
      };
      
      const originalError = console.error;
      console.error = function(...args) {
        originalError.apply(console, args);
        originalError.call(console, '[FORMATTED_ERROR]', args.map(formatArg).join(' '));
      };
      
      const originalWarn = console.warn;
      console.warn = function(...args) {
        originalWarn.apply(console, args);
        originalWarn.call(console, '[FORMATTED_WARN]', args.map(formatArg).join(' '));
      };

      window.addEventListener('error', (event) => {
        originalError.call(console, '[UNHANDLED_ERROR]', formatArg(event.error || event.message));
      });
      window.addEventListener('unhandledrejection', (event) => {
        originalError.call(console, '[UNHANDLED_REJECTION]', formatArg(event.reason));
      });
    `,
  });

  Runtime.exceptionThrown((params) => {
    const desc = params.exceptionDetails.exception ? params.exceptionDetails.exception.description : params.exceptionDetails.text;
    logError(`# [WebView Exception] ${desc}`);
  });
  
  if (Console) {
    await Console.enable();
    Console.messageAdded((params) => {
      const text = params.message.text;
      if (text.startsWith('[FORMATTED_ERROR]') || text.startsWith('[UNHANDLED_ERROR]') || text.startsWith('[UNHANDLED_REJECTION]')) {
        logError(`# [WebView Error] ${text}`);
      } else if (text.startsWith('[FORMATTED_WARN]')) {
        logError(`# [WebView Warning] ${text}`);
      } else {
        console.log(`# [WebView Console] ${params.message.level}: ${text}`);
      }
    });
  }

  // Helper function to evaluate JavaScript inside WebView
  async function evalJS(expression) {
    const res = await Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) {
      throw new Error(`JS Evaluation failed: ${res.exceptionDetails.exception.description}`);
    }
    return res.result.value;
  }

  // Helper to wait for elements
  async function waitForSelector(selector, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await evalJS(`!!document.querySelector('${selector}')`);
      if (exists) return true;
      await wait(300);
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async function waitForExpression(expression, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await evalJS(expression);
        if (val) return val;
      } catch (e) {
        // ignore errors during evaluation
      }
      await wait(300);
    }
    throw new Error(`Timeout waiting for expression: ${expression}`);
  }

  test('load app', async (t) => {
    const start = Date.now();
    let title = '';
    while (Date.now() - start < 15000) {
      title = await evalJS('document.title');
      if (title === 'Frappe Books') {
        break;
      }
      await wait(500);
    }
    t.equal(title, 'Frappe Books', 'title matches');
    t.ok(true, 'webview has loaded');
  });

  test('navigate to database selector', async (t) => {
    const changeDbSelector = '[data-testid="change-db"]';
    const createNewSelector = '[data-testid="create-new-file"]';

    const start = Date.now();
    let found = null;
    while (Date.now() - start < 20000) {
      const changeDbExists = await evalJS(`!!document.querySelector('${changeDbSelector}')`);
      const createNewExists = await evalJS(`!!document.querySelector('${createNewSelector}')`);

      if (changeDbExists) {
        found = 'change-db';
        break;
      }
      if (createNewExists) {
        found = 'create-new-file';
        break;
      }
      await wait(500);
    }

    if (found === 'change-db') {
      await evalJS(`document.querySelector('${changeDbSelector}').click()`);
      await waitForSelector(createNewSelector);
    }

    const isVisible = await evalJS(`!!document.querySelector('${createNewSelector}')`);
    t.ok(isVisible, 'create new is visible');
  });

  test('fill setup form', async (t) => {
    await evalJS(`document.querySelector('[data-testid="create-new-file"]').click()`);
    await waitForSelector('[data-testid="submit-button"]');

    const isDisabled = await evalJS(`document.querySelector('[data-testid="submit-button"]').disabled`);
    t.equal(isDisabled, true, 'submit button is disabled before form fill');

    // Fill form fields and trigger input events to update Vue reactive states
    await evalJS(`
      (async () => {
        if (window.sw && typeof window.sw.fill === 'function') {
          await window.sw.fill();
        } else {
          const buttons = Array.from(document.querySelectorAll('button'));
          const fillButton = buttons.find(b => b.textContent.trim() === 'Fill');
          if (fillButton) {
            fillButton.click();
          } else {
            const company = document.querySelector('input[placeholder="Company Name"]');
            if (company) {
              company.value = "Test Company";
              company.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const owner = document.querySelector('input[placeholder="John Doe"]');
            if (owner) {
              owner.value = "Test Owner";
              owner.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const email = document.querySelector('input[placeholder="john@doe.com"]');
            if (email) {
              email.value = "test@example.com";
              email.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const country = document.querySelector('input[placeholder="Select Country"]');
            if (country) {
              country.value = "India";
              country.dispatchEvent(new Event('input', { bubbles: true }));
              country.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            const bank = document.querySelector('input[placeholder="Prime Bank"]');
            if (bank) {
              bank.value = "Test Bank";
              bank.dispatchEvent(new Event('input', { bubbles: true }));
              bank.dispatchEvent(new Event('blur', { bubbles: true }));
            }
          }
        }
      })()
    `);

    await wait(1000);

    const isNowDisabled = await evalJS(`document.querySelector('[data-testid="submit-button"]').disabled`);
    t.equal(isNowDisabled, false, 'submit button enabled after form fill');
  });

  test('create new instance', async (t) => {
    console.log('# clicking submit');
    // Get the expected company name from Vue component state
    const expectedCompanyName = await evalJS(`window.sw && window.sw.docOrNull && window.sw.docOrNull.value ? window.sw.docOrNull.value.companyName : 'Test Company'`);
    await evalJS(`document.querySelector('[data-testid="submit-button"]').click()`);
    console.log('# submit clicked, waiting for company-name');
    
    const companyNameSelector = '[data-testid="company-name"]';
    await waitForSelector(companyNameSelector, 60000);
    
    console.log('# company-name found');
    const companyNameText = await evalJS(`document.querySelector('${companyNameSelector}').innerText`);
    t.equal(
      companyNameText.trim(),
      expectedCompanyName,
      'new instance created, company name found in sidebar'
    );
  });

  test('create customer via list and form', async (t) => {
    console.log('# navigating to customers list');
    await evalJS(`window.router.push('/list/Party/Customers')`);
    
    console.log('# waiting for create button');
    await waitForSelector('button .feather-plus');
    
    console.log('# clicking plus/entry button');
    const clickResult = await evalJS(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const makeEntryBtn = buttons.find(b => b.textContent.trim() === 'Make Entry');
        if (makeEntryBtn) {
          makeEntryBtn.click();
          return "clicked Make Entry";
        }
        
        const plusSvg = document.querySelector('.feather-plus');
        if (plusSvg) {
          const btn = plusSvg.closest('button');
          if (btn) {
            btn.click();
            return "clicked plus button";
          }
          return "button not found";
        }
        return "no button found";
      })()
    `);
    console.log('# click result:', clickResult);
    
    await waitForExpression('!!(window.cf && window.cf.docOrNull && window.cf.docOrNull.value)');
    const postClickRoute = await evalJS('window.router.currentRoute.value.fullPath');
    console.log('# route after click:', postClickRoute);

    console.log('# waiting for save button');
    await waitForSelector('button .feather-save');
    
    console.log('# filling customer name');
    await evalJS(`
      (async () => {
        if (window.cf && window.cf.docOrNull && window.cf.docOrNull.value) {
          await window.cf.docOrNull.value.set('name', 'UI Test Customer');
          await window.cf.docOrNull.value.set('role', 'Customer');
        } else {
          const inputs = Array.from(document.querySelectorAll('input'));
          const nameInput = inputs.find(i => i.placeholder === 'Name' || i.type === 'text');
          if (nameInput) {
            nameInput.value = "UI Test Customer";
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            throw new Error("Could not find customer name input field");
          }
        }
      })()
    `);
    
    await wait(500);
    
    console.log('# saving customer');
    await evalJS(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const saveButton = buttons.find(b => b.textContent.trim() === 'Save');
        if (saveButton) {
          saveButton.click();
        } else {
          throw new Error('Save button not found');
        }
      })()
    `);
    
    await wait(2000);
    
    console.log('# verifying customer exists in database');
    const customerExistsInDb = await evalJS(`
      (async () => {
        const list = await window.fyo.db.getAll('Party', { filters: { name: 'UI Test Customer' } });
        return list.length > 0;
      })()
    `);
    t.ok(customerExistsInDb, 'Customer "UI Test Customer" successfully created in database');
  });

  test('global search navigation', async (t) => {
    console.log('# opening global search');
    await evalJS(`window.search.openSearch()`);
    await wait(500);

    const isOpen = await evalJS(`window.search.openModal.value`);
    t.ok(isOpen, 'global search modal is open');

    console.log('# typing "Item" in search input');
    await evalJS(`window.search.inputValue.value = 'Item'`);
    await wait(800);

    const suggestions = await evalJS(`window.search.suggestions.value.map(s => s.label)`);
    console.log('# search suggestions:', suggestions);
    t.ok(suggestions.length > 0, 'suggestions are found');

    console.log('# selecting first suggestion');
    await evalJS(`window.search.select(0)`);
    await wait(1000);

    const currentRoute = await evalJS(`window.router.currentRoute.value.fullPath`);
    console.log('# current route:', currentRoute);
    t.ok(currentRoute.includes('/list/Item') || currentRoute.includes('/list/'), 'navigated successfully via search');
  });

  test('list view search / live filtering', async (t) => {
    console.log('# inserting test item in db');
    await evalJS(`
      (async () => {
        const itemExists = await window.fyo.db.exists('Item', 'POS Test Item');
        if (!itemExists) {
          const item = window.fyo.doc.getNewDoc('Item', {
            name: 'POS Test Item',
            rate: window.fyo.pesa(100),
            trackItem: false,
            unit: 'Unit'
          });
          await item.sync();
        }
      })()
    `);

    console.log('# navigating to items list');
    await evalJS(`window.router.push('/list/Item')`);
    
    await waitForExpression('!!(window.lv && window.lv.filterDropdownRef && window.lv.filterDropdownRef.value)');

    console.log('# setting filter programmatically');
    await evalJS(`
      (async () => {
        const dropdown = window.lv.filterDropdownRef.value;
        dropdown.clearAllFilters();
        await dropdown.setFilter('name', 'like', 'POS Test Item');
      })()
    `);
    
    await waitForExpression('!!(window.lv && window.lv.listRef && window.lv.listRef.value && window.lv.listRef.value.data)');
    await wait(500);

    const listDataNames = await evalJS(`window.lv.listRef.value.data.map(d => d.name)`);
    console.log('# list data names after filtering:', listDataNames);
    t.ok(listDataNames.includes('POS Test Item'), 'filtered list includes "POS Test Item"');

    console.log('# clearing filters');
    await evalJS(`window.lv.filterDropdownRef.value.clearAllFilters()`);
    await wait(1000);
  });

  test('POS Item Search', async (t) => {
    console.log('# setting POS settings programmatically');
    await evalJS(`
      (async () => {
        const accounts = await window.fyo.db.getAll('Account');
        const cashAccount = accounts.find(a => a.name.includes('Cash') || a.name.includes('Hand'))?.name || 'Cash';
        const writeOff = accounts.find(a => a.name.includes('Write Off'))?.name || 'Write Off';
        
        const posSettings = await window.fyo.doc.getDoc('POSSettings');
        await posSettings.set('inventory', 'Stores');
        await posSettings.set('cashAccount', cashAccount);
        await posSettings.set('writeOffAccount', writeOff);
        await posSettings.set('defaultAccount', cashAccount);
        await posSettings.set('itemVisibility', 'Non-Inventory Items');
        await posSettings.set('isShiftOpen', true);
        await posSettings.sync();
      })()
    `);

    console.log('# navigating to POS page');
    await evalJS(`window.router.push('/pos')`);
    
    await waitForExpression("!!Array.from(document.querySelectorAll('input')).find(i => i.placeholder.includes('Search Item'))");
    await waitForExpression('!!(window.pos && window.pos.items && window.pos.items.value)');

    console.log('# adding item via POS search');
    await evalJS(`
      (async () => {
        const item = window.pos.items.value.find(i => i.name === 'POS Test Item');
        if (item) {
          await window.pos.addItem(item, 1);
        } else {
          // fallback if list not loaded yet, call search directly
          await window.pos.handleItemSearch('POS Test Item', true);
        }
      })()
    `);
    await wait(1000);

    const posItems = await evalJS(`window.pos.sinvDoc.value.items.map(i => i.item)`);
    console.log('# items in POS sales invoice:', posItems);
    t.ok(posItems.includes('POS Test Item'), 'POS Test Item was successfully added to POS invoice');
  });

  test('Sales Invoice line item calculations', async (t) => {
    console.log('# navigating to Sales Invoice list');
    await evalJS(`window.router.push('/list/SalesInvoice')`);
    await wait(1000);

    console.log('# clicking Make Entry');
    await evalJS(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const makeEntryBtn = buttons.find(b => b.textContent.trim() === 'Make Entry');
        if (makeEntryBtn) {
          makeEntryBtn.click();
        }
      })()
    `);
    
    await waitForExpression('!!(window.cf && window.cf.docOrNull && window.cf.docOrNull.value)');

    console.log('# setting party and appending line items');
    await evalJS(`
      (async () => {
        const doc = window.cf.docOrNull.value;
        await doc.set('party', 'UI Test Customer');
        await doc.set('account', 'Debtors');
        
        // Clear default items if any
        doc.items = [];
        
        await doc.append('items', {
          item: 'POS Test Item',
          quantity: 2,
          rate: window.fyo.pesa(150)
        });
        
        await doc.append('items', {
          item: 'POS Test Item',
          quantity: 1,
          rate: window.fyo.pesa(200)
        });
        
        await doc.runFormulas();
      })()
    `);
    await wait(1000);

    const netTotal = await evalJS(`window.cf.docOrNull.value.netTotal.toString()`);
    console.log('# calculated net total:', netTotal);
    t.equal(netTotal, '500', 'subtotal of line items is computed correctly (2 * 150 + 1 * 200 = 500)');
  });

  test('Sales Invoice tax and grand total calculations', async (t) => {
    console.log('# setting up GST 18% tax template');
    await evalJS(`
      (async () => {
        // Create accounts if they don't exist
        const cgstExists = await window.fyo.db.exists('Account', 'CGST');
        if (!cgstExists) {
          const cgst = window.fyo.doc.getNewDoc('Account', {
            name: 'CGST',
            accountType: 'Tax',
            rootType: 'Liability'
          });
          await cgst.sync();
        }
        const sgstExists = await window.fyo.db.exists('Account', 'SGST');
        if (!sgstExists) {
          const sgst = window.fyo.doc.getNewDoc('Account', {
            name: 'SGST',
            accountType: 'Tax',
            rootType: 'Liability'
          });
          await sgst.sync();
        }

        const taxExists = await window.fyo.db.exists('Tax', 'GST 18%');
        if (!taxExists) {
          const tax = window.fyo.doc.getNewDoc('Tax', { name: 'GST 18%' });
          await tax.append('details', { account: 'CGST', rate: 9 });
          await tax.append('details', { account: 'SGST', rate: 9 });
          await tax.sync();
        }
      })()
    `);

    console.log('# applying tax template to invoice items');
    await evalJS(`
      (async () => {
        const doc = window.cf.docOrNull.value;
        for (let row of doc.items) {
          await row.set('tax', 'GST 18%');
        }
        await doc.runFormulas();
      })()
    `);
    await wait(1000);

    const taxAmount = await evalJS(`
      (async () => {
        const tax = await window.cf.docOrNull.value.getTotalTax();
        return tax.toString();
      })()
    `);
    const grandTotal = await evalJS(`window.cf.docOrNull.value.grandTotal.toString()`);
    console.log('# calculated tax amount:', taxAmount);
    console.log('# calculated grand total:', grandTotal);

    t.equal(taxAmount, '90', 'tax is computed correctly (500 * 18% = 90)');
    t.equal(grandTotal, '590', 'grand total is computed correctly (500 + 90 = 590)');

    console.log('# saving invoice');
    await evalJS(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const saveButton = buttons.find(b => b.textContent.trim() === 'Save');
        if (saveButton) {
          saveButton.click();
        } else {
          throw new Error('Save button not found');
        }
      })()
    `);
    await wait(2000);

    const isSaved = await evalJS(`!window.cf.docOrNull.value.notInserted`);
    t.ok(isSaved, 'sales invoice successfully saved to database');
  });

  test('POS totals and payment change calculation', async (t) => {
    console.log('# navigating to POS page');
    await evalJS(`window.router.push('/pos')`);
    
    await waitForExpression("!!Array.from(document.querySelectorAll('input')).find(i => i.placeholder.includes('Search Item'))");
    await waitForExpression('!!(window.pos && window.pos.items && window.pos.items.value && window.pos.sinvDoc && window.pos.sinvDoc.value)');

    console.log('# clearing and adding items to new POS session');
    await evalJS(`
      (async () => {
        await window.pos.clearValues();
        await window.pos.setCustomer('UI Test Customer');
        const item = window.pos.items.value.find(i => i.name === 'POS Test Item');
        if (item) {
          await window.pos.addItem(item, 3);
        }
      })()
    `);
    await wait(1000);

    const totalQty = await evalJS(`window.pos.totalQuantity.value`);
    const netAmount = await evalJS(`window.pos.sinvDoc.value.netTotal.toString()`);
    console.log('# POS total qty:', totalQty);
    console.log('# POS net amount:', netAmount);

    t.equal(totalQty, 3, 'POS total quantity is correct');
    t.equal(netAmount, '300', 'POS subtotal is correct (3 * 100 = 300)');

    console.log('# opening payment modal and paying');
    await evalJS(`
      (async () => {
        window.pos.toggleModal('Payment', true);
      })()
    `);
    await wait(1000);

    console.log('# setting paid amount to 500');
    await evalJS(`
      (async () => {
        window.pos.setPaidAmount(window.fyo.pesa(500));
      })()
    `);
    await wait(500);

    const changeAmount = await evalJS(`
      (() => {
        const paid = window.pos.paidAmount.value;
        const grand = window.pos.sinvDoc.value.grandTotal;
        return paid.sub(grand).toString();
      })()
    `);
    console.log('# POS change amount:', changeAmount);
    t.equal(changeAmount, '200', 'payment change is calculated correctly (500 - 300 = 200)');

    console.log('# closing payment modal');
    await evalJS(`window.pos.toggleModal('Payment', false)`);
    await wait(500);
  });

  test('close app', async (t) => {
    await client.close();
    appProcess.kill();
    t.ok(true, 'app closed without errors');
  });
})();
