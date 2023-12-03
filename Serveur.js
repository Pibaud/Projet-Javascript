const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use('/public', express.static('public', { 'extensions': ['css'] }));

app.use(express.static('public'));

app.get('/', (request, response) => {
    response.sendFile('Projet.html', {root: __dirname});
});

var nbJoueurs;
var nbTours;
var joueurs = [];
var jeton = -1;
const couleurs = ["#E74C3C","#9B59B6","#F1C40F","#FF8BF1"];
  
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
        joueur.set("couleur", "#E74C3C");
        joueur.set("reproduction", data.reproduction);
        joueur.set("perception", data.perception);
        joueur.set("force", data.force);
        console.log(joueur);
        joueurs.push(joueur);
        if(data.nbJoueurs == 1){
            jeton = 0;
            console.log("Le jeton passe à 0, la partie peut commencer");
            socket.emit('messageServeur', 'La partie commence');
            socket.emit('partie', joueurs);
        }
        else{
            socket.emit('messageServeur', "1/"+nbJoueurs+" joueurs. En attente...");
            socket.broadcast.emit('creation',joueur);
        }
    });

    socket.on('entree', data => {
        console.log("Entrée dans la partie de "+data.nom);
        console.log(joueurs.length);
        if (joueurs.length < nbJoueurs)
            if (!joueurs.some(joueur => joueur.get('name') === data.nom)) {
                var joueur = new Map();
                joueur.set("num", joueurs.length);
                joueur.set("name", data.nom);
                joueur.set("couleur", couleurs[joueurs.length]);
                joueur.set("reproduction", data.reproduction);
                joueur.set("perception", data.perception);
                joueur.set("force", data.force);
                console.log(joueur);
                joueurs.push(joueur);
                io.emit('messageServeur', joueurs.length+"/"+nbJoueurs+" joueurs. En attente...");
                if (joueurs.length == nbJoueurs){
                    jeton = 0;
                    console.log("Le jeton passe à 0, la partie peut commencer");
                    io.emit('messageServeur', 'La partie commence');
                    io.emit('partie', joueurs);
                }
                let nomsJoueurs = "";
                for (let joueur of joueurs) nomsJoueurs += joueur.get('name')+" ";
                socket.emit('entree', {'nomJoueur':data.nom,
                                       'numJoueur':joueurs.length-1,
                                       'nomsJoueurs':nomsJoueurs});
                if (joueurs.length > 1)
                    socket.broadcast.emit('entreeAutreJoueur',
                                        {'nomJoueur':data.nom,
                                        'nomsJoueurs':nomsJoueurs});
            }
            else socket.emit('messageServeur', 'Nom de joueur déjà enregistré');
        else socket.emit('messageServeur', 'Nombre de joueurs maximal déjà atteint !');
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

    socket.on('demandeNbJoueurs', function(){
        socket.emit('nbJoueurs', {'nombreMax':nbJoueurs,'nbActuel':joueurs.length});
    });
});