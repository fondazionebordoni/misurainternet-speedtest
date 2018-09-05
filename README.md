# misurainternet-speedtest

Server utilizzato per effettuare i test su una rete locale per il progetto [misurainternet-ui](https://github.com/fondazionebordoni/misurainternet-ui).

## Table of Contents

- [Informazioni](#Informazioni)
- [Requisiti](#Requisiti)
- [Istruzioni](#Istruzioni)
    - [Configurazione ambiente di sviluppo](#Configurazione-ambiente-di-sviluppo)
    - [Configurazione server](#Configurazione-server)
    - [Avvio server](#Avvio-server)
- [English instructions](#English-instructions)

## Informazioni

Questo progetto è un server di mockup per MisuraInternet Speedtest.
Può essere usato a fini di testing e debugging in una rete locale come server di test.

## Requisiti

* Installare/aggiornare Git all'ultima versione disponibile. Necessario per scaricare e         gestire il codice del progetto.
* Installare/aggiornare Node.js all'ultima versione LTS disponibile.
* Aggiornare npm all'ultima versione disponibile. Necessario per l'esecuzione                   dell'applicazione.

## Istruzioni

Istruzioni passo passo per configurare l'ambiente di sviluppo e il server in locale

### Configurazione ambiente di sviluppo

* Usare Git per clonare il progetto da GitHub. Usando Git Bash scrivere:
`git clone https://github.com/fondazionebordoni/misurainternet-speedtest.git`
* Dalla bash, navigare nella cartella del progetto appena clonato `misurainternet-speedtest`
* Installare i package del progetto con il comando `npm install`.
  I package richiesti dal progetto sono descritti nel file `package.json`

### Configurazione server

Per configurare il server è sufficiente conoscere l'indirizzo IP della macchina su cui è in esecuzione il server.
L'ip va inserito direttamente nel codice.

* Clonare il repository misurainternet-ui sulla propria macchina.
* Aprire il file `/misurainternet-ui/public/speedtest.js`.
* Assicurarsi che la variabile `useCustomTestServer` sulla riga 20 abbia valore `true`.
* Scrivere il proprio indirizzo IP come valore della variabile `customTestServerIP` sulla       riga 21.

### Avvio server

Una volta configurato, il server è pronto per l'utilizzo
* Dalla bash, navigare nella cartella `/misurainternet-speedtest`
* Usare il comando `node server.js` per avviare il server e metterlo in ascolto.
Ora è pronto per ricevere richieste dallo speedtest.

## English instructions

This application is intendend for debugging and testing purposes only.
This server allows you to perform tests on a local network.

Requirements:
- Git installed
- Node.js with npm installed

Instructions for setting up development environment on your machine:

- Use Git to clone the project from GitHub. Launch `git clone https://github.com/fondazionebordoni/misurainternet-speedtest.git`
- From the terminal, navigate to the cloned project root directory `misurainternet-speedtest`
- Enter the command `npm install` and wait for it downloading all packages

You must configure this application to use a local server. Open the file `/misurainternet-ui/public/speedtest.js` and follow these instructions:
* Set `useCustomTestServer` on line 20 to `true`.
* Edit `customTestServerIP` on line 21 with your custom IP.

To run the server and make it listening navigate, with the bash, into `/misurainternet-speedtest` and run the command `node server.js`.
Now the server is ready.