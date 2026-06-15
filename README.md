<div align="center" markdown="1">
<br/>

<img src="https://frappe.io/files/books.png" alt="Auditbooks logo" width="80"/>

<br/>

<h1>Auditbooks</h1>

**Modern Accounting Made Simple**

![Platforms](https://img.shields.io/badge/platform-mac%2C%20windows%2C%20linux-yellowgreen)

</div>

<br />

## Auditbooks

Auditbooks is an open-source accounting software aimed at simplifying financial management for businesses. With its clean and user-friendly interface, it streamlines accounting tasks for small and medium-sized enterprises, offering a seamless solution for modern businesses to manage their finances with ease.

### Motivation

Auditbooks addresses a market gap where small businesses face expensive, complex accounting tools. It offers an intuitive, open-source solution that combines simplicity with essential features, empowering businesses to manage finances effectively—even offline.

### Key Features

- **Dashboard**: Provides an overview of key financial data and performance metrics.
- **Point of Sale**: Simplifies retail transactions with an integrated POS system for easy sales processing.
- **Works Offline**: Enables users to continue working without an internet connection and sync later.
- **Double-entry accounting**: Ensures accurate financial tracking by recording each transaction in two accounts.
- **Entries**
  - **Invoicing**: Allows businesses to create and manage professional invoices effortlessly.
  - **Billing**: Billing processes by generating bills and tracking payments.
  - **Payments**: Records and tracks payments received and made.
  - **Journal Entries**: Records financial transactions in the general ledger with detailed notes and adjustments.
- **Financial Reports**
  - **General Ledger**: Centralized record of all financial transactions, providing a comprehensive view of accounts.
  - **Profit and Loss Statement**: Summarizes revenues, costs, and expenses to show business profitability.
  - **Balance Sheet**: Displays a company’s assets, liabilities, and equity at a specific point in time.
  - **Trial Balance**: Verifies the accuracy of accounting records by ensuring that debits and credits are balanced.
    <br/>

### Under the Hood

- **Vue.js**: Auditbooks uses Vue.js for the front-end, enabling a reactive and component-based UI. It ensures seamless interactions and dynamic updates, giving users a modern, responsive experience.

- **Tauri**: Tauri is used to package Auditbooks as a standalone desktop application, providing a secure, lightweight, and native experience across Windows, macOS, and Linux with a Rust-based backend.

- **SQLite**: Auditbooks uses SQLite as its local database. All financial data, transactions, and configurations are stored securely in an SQLite file on the user's machine.

## Production Setup

### Manual

Download and install the latest release for your platform from the releases section.

## Development Setup

### Pre-requisites

To get the dev environment up and running you need to first set up Node.js `v22` and npm. For this, we suggest using
[nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

Next, you will need to install [Rust and Cargo](https://www.rust-lang.org/tools/install) as Tauri requires them to build the native backend binary.

Finally, make sure you have [pnpm](https://pnpm.io/installation) installed as the package manager.

### Clone and Run

Once you are through the Pre-requisites, you can run the following commands to setup Auditbooks for development:

```bash
# clone the repository
git clone https://github.com/landigit/auditbooks.git

# change directory
cd auditbooks

# install dependencies
pnpm install
```

To run Auditbooks in development mode (with hot reload, Tauri Dev tools, etc):

```bash
# start the tauri app
pnpm run dev
```

#### Build

To build Auditbooks and create an installer:

```bash
# build the tauri package
pnpm run build
```

The output installation files will be placed inside `src-tauri/target/release/bundle/`.

## Want to Contribute?

If you want to contribute code, you can fork this repo, make changes, and raise a PR.
