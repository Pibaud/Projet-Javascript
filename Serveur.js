const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = new require("socket.io")(server)

app.get('/', (request, response) => {
    response.sendFile('Projet.html', {root: __dirname});
});

var nbJoueurs = 4;  // Peut être positionnée à n'importe quelle valeur
var joueurs = [];
var jeton = -1;
  
server.listen(8888, () => {
    console.log('Le serveur écoute sur le port 8888');
});

io.on('connection', (socket) => {

    socket.on('entree', nomJoueur => {
        console.log("Entrée dans la partie de "+nomJoueur);
        if (joueurs.length < nbJoueurs)
            if (!joueurs.includes(nomJoueur)) {
                joueurs.push(nomJoueur);
                if (joueurs.length == nbJoueurs) {
                    jeton = 0;
                    console.log("Le jeton passe à 0, la partie peut commencer");
                }
                let nomsJoueurs = "";
                for (let nom of joueurs) nomsJoueurs += nom+" ";
                socket.emit('entree', {'nomJoueur':nomJoueur,
                                       'numJoueur':joueurs.length-1,
                                       'nomsJoueurs':nomsJoueurs});
                if (joueurs.length > 1)
                    socket.broadcast.emit('entreeAutreJoueur',
                                        {'nomJoueur':nomJoueur,
                                        'nomsJoueurs':nomsJoueurs});
            }
            else socket.emit('messageServeur', 'Nom de joueur déjà enregistré');
        else socket.emit('messageServeur', 'Nombre de joueurs déjà atteint !');
    });

    socket.on('sortie', nomJoueur => {
        console.log("Sortie de la partie de "+nomJoueur);
        let index = joueurs.indexOf(nomJoueur)
        if  (index != -1) {
            joueurs.splice(index, 1);
            jeton = -1;
            let nomsJoueurs = "";
            for (let nom of joueurs) nomsJoueurs += nom+" ";
            socket.emit('sortie', {'nomJoueur':nomJoueur,
                                    'nomsJoueurs':nomsJoueurs});
            socket.broadcast.emit('sortieAutreJoueur',
                                    {'nomJoueur':nomJoueur,
                                    'numJoueur': 0,
                                    'nomsJoueurs':nomsJoueurs});
        }
        else socket.emit('messageServeur', 'Joueur inconnu');
    });

    socket.on('message', data => {
        console.log("Message à diffuser de",data.numJoueur,":",data.texte);
        if (data.numJoueur == -1) socket.emit('messageServeur', 'Vous devez vous inscrire dans la partie !');
        else {
            let message = joueurs[data.numJoueur]+" : "+data.texte;
            console.log("Message à diffuser :", message)
            io.emit('message', message);
        }
    });
});