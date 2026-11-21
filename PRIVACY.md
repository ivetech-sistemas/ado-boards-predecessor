# Privacy Policy — Predecessores no card (Azure Boards)

*Versão em português: [PRIVACIDADE.md](PRIVACIDADE.md).*

Last updated: November 21, 2026.

"Predecessores no card" ("the extension") is an open-source browser extension for Microsoft Edge and
Google Chrome. Inside Azure Boards cards (Kanban board and sprint taskboard), it shows the
predecessors of each work item that are not done yet. It is published by Ivetech Sistemas under the
MIT License, and its source code is at
<https://github.com/ivetech-sistemas/ado-boards-predecessor>.

## Summary

- The extension **does not collect, transmit, sell or share** any personal or usage data.
- It has **no servers**, no analytics, no telemetry, no ads and no third-party services.
- Work item data is read from **your own Azure DevOps organization**, with **your own session**, and
  stays **in memory in your browser tab**.
- The only thing it stores is **your preferences** from the options page.

## Data the extension accesses

To draw the lines on the cards, the extension reads, **inside your browser**, Azure DevOps data that
you already have permission to see:

| Data | Why |
| --- | --- |
| IDs of the cards visible on the board or taskboard | To know which work items to look up |
| Predecessor links (`System.LinkTypes.Dependency-Reverse`) of those cards, and each card's state | To find the predecessors, and to hide them on cards that are already done |
| Title, work item type, state and project of each predecessor | To show the line and build the link to the predecessor |
| Assigned person of each predecessor (display name and avatar image) | To show the avatar or initials and the name in the tooltip |
| Colors and categories of the work item states of your process | To show the state color and to hide completed predecessors |

This data is requested **only from the Azure DevOps REST API of the organization you have open**
(`https://dev.azure.com/*` or `https://*.visualstudio.com/*`), as same-origin requests that use the
session you are already signed in with, the same way the Azure DevOps web page does.

## What the extension does not do

- **No data leaves Azure DevOps.** The extension never sends data to the developer, to Ivetech
  Sistemas or to any third party. It makes no network requests to any domain other than your Azure
  DevOps organization.
- **No credentials.** It does not ask for or store personal access tokens (PATs) or passwords, and
  it does not read cookies.
- **No writes.** It never creates, changes or deletes work items or links.
- **No tracking.** No analytics, telemetry, crash reporting, fingerprinting or advertising.
- **No remote code.** All of the extension's code is included in the published package.
- **No sale or transfer of data**, and no use of data for purposes unrelated to the extension's
  single purpose, for creditworthiness or for lending.

## Data storage and retention

- **Work item data** (titles, states, assignees and so on) is kept **only in the memory of the
  browser tab**, for a short time (60 seconds by default, configurable in the options), so the board
  does not have to be queried again on every scroll. It is discarded when the tab is closed or
  reloaded, and it is never written to disk by the extension.
- **Preferences** from the options page (show on board or taskboard, maximum lines per card, open in
  a new tab, hide on completed cards, cache duration) are stored with `chrome.storage.sync`. If you
  have browser sync turned on, your browser (Edge or Chrome) syncs them between your devices under
  its own privacy policy. No work item data is stored there.

You can delete all stored preferences at any time by removing the extension.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `storage` | To save your preferences from the options page |
| `https://dev.azure.com/*` | To add the predecessor lines to Azure Boards pages and to read predecessor data from the Azure DevOps REST API, for organizations hosted on `dev.azure.com` |
| `https://*.visualstudio.com/*` | The same, for organizations hosted on `*.visualstudio.com` |

The extension does not request access to any other website, to your browsing history, to your tabs
or to your cookies.

## Children's privacy

The extension is a productivity tool for Azure DevOps users. It is not directed to children and does
not knowingly process data about children.

## Changes to this policy

If this policy changes, the new version will be published in this file, with a new "Last updated"
date, and listed in the [CHANGELOG](CHANGELOG.md). Since the extension collects no data, a change
cannot affect data collected in the past.

## Contact

For questions about this policy or about the extension, open an issue at
<https://github.com/ivetech-sistemas/ado-boards-predecessor/issues>.

*Azure DevOps and Azure Boards are trademarks of Microsoft Corporation. This extension is not
affiliated with or endorsed by Microsoft.*
