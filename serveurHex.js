const { Console } = require('console');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = new require("socket.io")(server)

app.get('/', (request, response) => {
    response.sendFile('clientHex.html', {root: __dirname});
});

var nbLignes = nbColonnes = 11;
var nbJoueurs = 2;  // Peut être > 2
var joueurs = [];
var deserteurs = [];
var couleurs = ["red", "blue", "yellow", "green"];
var hex = []; for (let i=0; i<nbLignes*nbColonnes; i++) hex.push(-1);
var jeton = -1;  // tour de jeu
var chat = [];

var bordN = [], bordO = [], bordS = [], bordE = [];
var N = O = S = E = false;
for (let i=0; i<nbLignes; i++) bordN.push(i);
for (let i=0; i<nbLignes*nbColonnes; i+=11) bordO.push(i);
for (let i=10; i<nbLignes*nbColonnes; i+=11) bordE.push(i);
for (let i=0; i<nbLignes; i+=1) bordS.push(i+(nbLignes*(nbColonnes-1)));
//console.dir(bordN.toString());
//console.dir(bordO);
//console.dir(bordE);
//console.dir(bordS);

server.listen(8888, () => {
    console.log('Le serveur écoute sur le port 8888');
});

/*
const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
    console.log('Le serveur écoute sur le port '+PORT);
});
*/

// Emplacements de même joueur accessibles depuis la position courante
function positionsConnexes(j, p) {
    let connexes = [];
    if (p-nbLignes >= 0 && hex[p-nbLignes] == j) connexes.push(p-nbLignes);
    if (!bordE.includes(p) && p-nbLignes+1 >= 0 && hex[p-nbLignes+1] == j) connexes.push(p-nbLignes+1);
    if (!bordO.includes(p) && p-1 >= 0 && hex[p-1] == j) connexes.push(p-1);
    if (!bordE.includes(p) && p+1 < nbLignes*nbColonnes && hex[p+1] == j) connexes.push(p+1);
    if (p+nbLignes-1 < nbLignes*nbColonnes && !bordO.includes(p) && p+nbLignes-1 >= 0 && hex[p+nbLignes-1] == j) connexes.push(p+nbLignes-1);
    if (p+nbLignes < nbLignes*nbColonnes && hex[p+nbLignes] == j) connexes.push(p+nbLignes);
    console.log(p, ":", connexes);
    return connexes;
}

function verificationVictoire(joueur, position, chemin) {
    //console.log("Dans verificationVictoire avec", position, "et ["+chemin.toString()+"]");
    if ( bordE.includes(position) ) {E = true; console.log(joueurs[joueur]+" => bord est");}
    if ( bordS.includes(position) ) {S = true; console.log(joueurs[joueur]+" => bord sud");}
    if ( bordO.includes(position) ) {O = true; console.log(joueurs[joueur]+" => bord ouest");}
    if ( bordN.includes(position) ) {N = true; console.log(joueurs[joueur]+" => bord nord");}
    if ((N == true && S == true) || (E == true && O == true)) return true;
    let posConnexes = positionsConnexes(joueur, position);
    //console.log("Positions connexes de", position, ": [", posConnexes.toString()+"]");
    for (let p of posConnexes) {
        if (!chemin.includes(p)) { // Anti-cycle
            chemin.push(p);
            let victoire = verificationVictoire(joueur, p, chemin);
            if (victoire == true) return true;
            chemin.pop();
        }
    }
    return false;
}

io.on('connection', (socket) => {

    socket.on('pion', data => {
        console.dir(data);
        if (jeton != -1) {
            let numJoueur = data.numJoueur;
            if (numJoueur == jeton) {
                let position = data.position;
                if (position >= 0 && position < nbLignes*nbColonnes) {
                    if (hex[position] == -1) {
                        hex[position] = numJoueur;
                        do {
                            jeton++;
                            if (jeton == joueurs.length) jeton = 0;}
                        while (deserteurs[jeton] == 'X');
                        console.log("Pion placé en "+position+" par "+numJoueur);
                        socket.emit('message', {message:"Pion placé en "+position});
                        io.emit('pion', {'position':position,'numJoueur':numJoueur, 'jeton':jeton});
                        console.log("---------------------------------------------------");
                        E = S = O = N = false;  // booleens d'arrivée sur un bord
                        let victoire = verificationVictoire(numJoueur, position, [position]);
                        if (victoire == true) {
                            let listeBords = "";
                            if (N && S) listeBords = " N <=> S";
                            if (O && E) listeBords += " O <=> E";
                            console.log("VICTOIRE de ", joueurs[numJoueur], ":", listeBords);
                            chat.push({'message':"VICTOIRE de "+joueurs[numJoueur]+" : "+listeBords, 'couleur':couleurs[numJoueur]});
                            io.emit("messages", chat);
                        }
                    }
                    else socket.emit('message', 'Emplacement déjà occupé');
                }
                else socket.emit('message', 'Coordonnées incorrectes');
            }
            else {
                socket.emit('message', 'Mauvais tour');
                console.log('Mauvais tour');
            }
        }
        else socket.emit('message', 'Partie non commencée');
    });

    socket.on('joueurs', () => {
        console.log("Joueurs : ");
        console.dir(joueurs);
        socket.emit('joueurs', joueurs);
    });

    socket.on('entree', nomJoueur => {
        console.log("Entrée dans la partie de "+nomJoueur);
        if (jeton == -1)
            if (joueurs.length < nbJoueurs)
                if (!joueurs.includes(nomJoueur)) {
                    joueurs.push(nomJoueur);
                    socket.emit('entree', {'nomJoueur':nomJoueur,
                                        'numJoueur':joueurs.length-1,
                                        'nomsJoueurs':joueurs});
                    socket.broadcast.emit('entreeAutreJoueur',
                                            {'nomJoueur':nomJoueur,
                                            'numJoueur':joueurs.length-1,
                                            'nomsJoueurs':joueurs});
                }
                else socket.emit('message', 'Joueur déjà enregistré');
            else socket.emit('message', 'Déjà quatre joueurs');
        else {
            console.log("Entrée dans une partie en cours");
            chat.push({'message':nomJoueur+" ne peut pas entrer dans une partie en cours", 'couleur':'black'});
            io.emit("messages", chat);
        }
    });

    socket.on('sortie', nomJoueur => {
        console.log("Sortie de",nomJoueur);
        let index = joueurs.indexOf(nomJoueur);
        if  (index != -1) {
            joueurs[index] = 'X';
            deserteurs[index] = 'X';
            let nbDeserteurs = 0;
            for (let nomJ of deserteurs) if (nomJ == 'X') nbDeserteurs++;
            if (joueurs.length - nbDeserteurs == 0) {
                console.log("Plus de joueurs dans la partie !");
                finPartie(nomJoueur, 'surSortie');
            }
            else {
                // Le joueur qui sort pouvait avoir le jeton
                if (index == jeton) 
                    do {
                        jeton++;
                        if (jeton == joueurs.length) jeton = 0;}
                    while (deserteurs[jeton] == 'X');
                socket.emit('sortie', {'numJoueur':index, 'nomJoueur':nomJoueur, 'nomsJoueurs':joueurs, 'jeton':jeton});
                socket.broadcast.emit('sortieAutreJoueur',
                                    {'numJoueur':index, 'nomJoueur':nomJoueur, 'nomsJoueurs':deserteurs, 'jeton':jeton});
                chat.push({'message':nomJoueur+" est sorti de la partie", 'couleur':'black'});
                io.emit('messages', chat);
                console.log(nomJoueur, "est sorti de la partie");
            }
        }
        else socket.emit('message', 'Joueur inconnu');
    });

    socket.on('debutPartie', nomJoueur => {
        console.log(nomJoueur+" vient de lancer la partie");
        deserteurs = []; for (let nomJoueur of joueurs) deserteurs.push(nomJoueur);
        jeton = 0;
        io.emit('debutPartie');
        chat.push({'message':nomJoueur+' a lancé la partie', 'couleur':'black'});
        io.emit("messages", chat);
    });

    function finPartie(nomJoueur, surSortie) {
        console.log(nomJoueur+" vient d'arrêter la partie");
        jeton = -1;
        // Compactage de joueurs au cas où il y aurait eu des déserteurs
        joueurs = [];
        for (let nomJ of deserteurs) if (nomJ != 'X') joueurs.push(nomJ);
        deserteurs = []; for (let nomJ of joueurs) deserteurs.push(nomJ);
        //console.log("joueurs :", joueurs);
        //console.log("déserteurs :", deserteurs);
        corridors = [];
        for (let i=0; i<nbLignes*nbColonnes; i++) {
            hex[i] = -1;
            corridors.push([]);
        }
        nbCorridors = [];
        for (let i=0; i<joueurs.length; i++) nbCorridors.push(0);
        io.emit('finPartie', {"contexte":surSortie, "nomsJoueurs":joueurs});
        chat.push({'message':nomJoueur+' a arrêté la partie', 'couleur':'black'});
        io.emit("messages", chat);
    }

    socket.on('finPartie', nomJoueur => {
        finPartie(nomJoueur, '');
    });

    socket.on('message', message => {
        console.log(message);
        chat.push({'message':message, 'couleur':'black'});
        io.emit('messages', chat);
    });

});