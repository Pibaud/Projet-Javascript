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
var c1 = [];
var c2 = [];
var c3 = [];
var c4 = [];
var toutesCréatures = [c1, c2, c3, c4];
var jeton = -1;
  
server.listen(8888, () => {
    console.log('Le serveur écoute sur le port 8888');
});

function nbAleatoire() {
    var x = Math.random() * 100;
    if (x < 15){
       return 1;
    }
    else if (x < 50){
       return 2;
    }
    else{
       return 3;
    }
}

function partie(tours){
    var cases = [];                   // création des biomes du terrain
    for (i = 0; i < 169; i ++){
        let couleur = nbAleatoire();
        switch (couleur){
            case 1:
                cases[i] = "#3498DB"; // eau
                break;

            case 2:
                cases[i] = "#8BC34A"; // prairie
                break;

            case 3:
                cases[i] = "#707B7C"; // rocher
                break;
        }
    }
    io.emit('cases', {'cases':cases, 'nbJoueurs':nbJoueurs}); // envoi des informations du terrain initial
    for (i = 0; i < nbJoueurs; i++){ // création de la liste de créatures de chaque joueur
        let M = new Map(); 
        let F = new Map();
        M.set("sexe","M");
        M.set("reproduction", joueurs[i].get("reproduction"));
        M.set("perception", joueurs[i].get("perception"));
        M.set("force", joueurs[i].get("force"));
        M.set("satiete", 10);
        M.set("hydratation", 10);
        F.set("sexe","F");
        F.set("reproduction", joueurs[i].get("reproduction"));
        F.set("perception", joueurs[i].get("perception"));
        F.set("force", joueurs[i].get("force"));
        F.set("satiete", 10);
        F.set("hydratation", 10);
        toutesCréatures[i].push(M);
        toutesCréatures[i].push(F);
        console.log("c1 : ",c1);
        console.log("c2 : ",c2);
    }
     //faire apparaître les créatures M/F (M = carré et F = triangle)
}

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
        joueurs.push(joueur);
        if(data.nbJoueurs == 1){
            jeton = 0;
            socket.emit('messageServeur', 'La partie commence');
            partie(nbTours);
        }
        else{
            socket.emit('messageServeur', "1/"+nbJoueurs+" joueurs. En attente...");
            socket.broadcast.emit('creation',joueur);
        }
    });

    socket.on('entree', data => {
        if (joueurs.length < nbJoueurs)
            if (!joueurs.some(joueur => joueur.get('name') === data.nom)) {
                var joueur = new Map();
                joueur.set("num", joueurs.length);
                joueur.set("name", data.nom);
                joueur.set("reproduction", data.reproduction);
                joueur.set("perception", data.perception);
                joueur.set("force", data.force);
                console.log(joueur);
                joueurs.push(joueur);
                io.emit('messageServeur', joueurs.length+"/"+nbJoueurs+" joueurs. En attente...");
                if (joueurs.length == nbJoueurs){
                    jeton = 0;
                    io.emit('messageServeur', 'La partie commence');
                    partie(nbTours);
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