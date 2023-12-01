const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = new require("socket.io")(server)

app.use(express.static('public'));

app.get('/', (request, response) => {
    response.sendFile('Projet.html', {root: __dirname});
});

var nbJoueurs;
var nbTours;
var joueurs = [];
var jeton = -1;
  
server.listen(8888, () => {
    console.log('Le serveur écoute sur le port 8888');
});

io.on('connection', (socket) => {

    socket.on('creation', data => {
        console.log(data.nom+" crée la partie");
        let joueur = new Map();
        nbJoueurs = data.nbJoueurs;
        nbTours = data.nbTours;
        joueur.set("num", 0);
        joueur.set("name", data.nom);
        joueur.set("reproduction", data.reproduction);
        joueur.set("perception", data.perception);
        joueur.set("force", data.force);
        console.log(joueur);
        joueurs.push(data.nom);
        socket.broadcast.emit('creation',joueur);
    });

    socket.on('entree', nomJoueur => {
        $("#quitterLaPartie").css("visibility","visible");
        console.log("Entrée dans la partie de "+nomJoueur);
        console.log(joueurs.length);
        if (joueurs.length < nbJoueurs)
            if (!joueurs.includes(nomJoueur)) {
                var joueur = new Map();
                joueur.set("name", nomJoueur);
                console.log(joueur);
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

    socket.on('nbJoueurs', data =>{
        nbJoueurs = data;
    });
});