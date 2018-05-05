Questo progetto è un server di mockup per MisuraInternet Speedtest.
Può essere usato a fini di testing e debugging in una rete locale come server di test.
Per maggiori informazioni sul progetto di MisuraInternet Speedtest andare sul repository https://github.com/fondazionebordoni/misurainternet-ui

Requisiti:
- Installare Git. Sarà necessario per scaricare e gestire il codice del progetto.
- Installare Node.js. Durante l'installazione dovrebbe essere installato anche npm, 
  necessario per l'esecuzione dell'applicazione. Assicurarsi che sia installato correttamente.

Istruzioni passo passo per creare l'ambiente di sviluppo sulla tua macchina:

- Usare Git per clonare il progetto da GitHub. Usando Git da linea di comando, lanciare "git clone https://github.com/fondazionebordoni/misurainternet-speedtest.git"
- Dal terminale, navigare nella cartella di root del progetto appena clonato "misurainternet-speedtest"
- Installare i package del progetto con il comando "npm install". I package richiesti dal progetto sono descritti nel file "package.json"

Adesso sarà possibile eseguire il server di test, effettuando i seguenti passaggi:
- Aprire una nuova finestra del terminale e navigare nella cartella di root del progetto e poi nella directory "Speedtest".
- Usare il comando "node server.js". Questo metterà in ascolto il server. Ora è pronto per ricevere richieste dallo speedtest.