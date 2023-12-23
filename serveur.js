const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use('/public', express.static('public', { 'extensions': ['css'] }));

app.use(express.static('public'));

app.get('/', (request, response) => {
    response.sendFile('projet.html', { root: __dirname });
});

var nbJoueurs;
var nbTours;
var cases = []; // pos : [colonne, ligne] (faire ligne*13+colonne pour avoir l'id cote client) couleur : code couleur, occupée : 0 1 2 
const couleurs = ["#FF003B", "#C400FF", "#F1C40F", "#FF8BF1"];
var joueurs = [];
var c1 = [];
var c2 = [];
var c3 = [];
var c4 = [];
var toutesCréatures = [c1, c2, c3, c4];
var reproductionPossible = false;
var positionsPossibles = [];
for (l = 0; l < 13; l++) {
    for (c = 0; c < 13; c++) {
        positionsPossibles.push([c, l]);
    }
}

server.listen(8888, () => {
    console.log('Le serveur écoute sur le port 8888');
});

function nbAleatoire() {
    var x = Math.random() * 100;
    if (x < 15) {
        return 1;
    }
    else if (x < 50) {
        return 2;
    }
    else {
        return 3;
    }
}

function caseLaPlusProche(listeCases, position) { // prend une liste d'objets case
    let positionPlusProche = listeCases[0].pos;
    let distanceMin = Distance(position, positionPlusProche);
    let caseBut = listeCases[0];

    for (let i = 1; i < listeCases.length; i++) {
        const distance = Distance(position, listeCases[i].pos);
        if (distance < distanceMin) {
            distanceMin = distance;
            positionPlusProche = listeCases[i].pos;
            caseBut = listeCases[i];
        }
    }
    return caseBut;
}

function positionLaPlusProche(listeCases, position) { // prend une liste de listes de coordonnées [x,y]
    let positionPlusProche = listeCases[0];
    let distanceMin = Distance(position, positionPlusProche);
    let caseBut = listeCases[0];

    for (let i = 1; i < listeCases.length; i++) {
        const distance = Distance(position, listeCases[i]);
        if (distance < distanceMin) {
            distanceMin = distance;
            positionPlusProche = listeCases[i];
            caseBut = listeCases[i];
        }
    }
    return caseBut;
}

function Distance(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    if (dx === 0 && dy === 0) {
        return 0;
    }
    return Math.sqrt(dx * dx + dy * dy);
}

function trouverVoisinVideLePlusProcheDeLaTaniere(voisins, cases, positionTaniere) {
    let voisinsVidesDansRayon = voisins.filter(voisin => {
        let caseVoisin = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
        return caseVoisin.occupants.length === 0;
    });

    if (voisinsVidesDansRayon.length === 0) {
        return null; // Aucun voisin vide trouvé
    }

    // Calculer la distance de chaque voisin vide par rapport à la tanière
    let voisinLePlusProche = voisinsVidesDansRayon[0];
    let distanceMin = Distance(positionTaniere, voisinLePlusProche);

    for (let i = 1; i < voisinsVidesDansRayon.length; i++) {
        const distance = Distance(positionTaniere, voisinsVidesDansRayon[i]);
        if (distance < distanceMin) {
            distanceMin = distance;
            voisinLePlusProche = voisinsVidesDansRayon[i];
        }
    }

    return voisinLePlusProche;
}

let caseObjectif;

function deplacer(c, tour) {
    let taniere = c.get("taniere");
    let position = [];
    position.push(c.get("posActuelle")[0]);
    position.push(c.get("posActuelle")[1]);
    let but;
    let perception = c.get("perception");
    let satiete = c.get("satiete");
    let hydratation = c.get("hydratation");
    let voisinsPossibles = [[0, 0]];
    if (perception >= 1) {
        voisinsPossibles.push(...[[0, 1], [0, -1], [1, 0], [1, -1], [-1, 0], [-1, 1]]);// ... permet de push chaque élément d'un coup et non la liste de tous les éléments
    }     // il faut que le non-déplacement soit possible, ie, s'il est sur une case qui va lui servir plusieurs tours il y reste, donc il faut compter la case actuelle comme voisin d'où le [0,0]
    if (perception >= 2) {
        voisinsPossibles.push(...[[0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1]]);
    }
    if (perception >= 3) {
        voisinsPossibles.push(...[[0, -3], [1, -3], [2, -3], [3, -3], [3, -2], [3, -1], [3, 0], [2, 1], [1, 2], [0, 3], [-1, 3], [-2, 3], [-3, 3], [-3, 2], [-3, 1], [-3, 0], [-2, -1], [-1, -2]]);
    }
    if (perception >= 4) {
        voisinsPossibles.push(...[[0, -4], [1, -4], [2, -4], [3, -4], [4, -4], [4, -3], [4, -2], [4, -1], [4, 0], [3, 1], [2, 2], [1, 3], [0, 4], [-1, 4], [-2, 4], [-3, 4], [-4, 4], [-4, 3], [-4, 2], [-4, 1], [-4, 0], [-3, -1], [-2, -2], [-1, -3]]);
    }
    if (perception == 5) {
        voisinsPossibles.push(...[[0, -5], [1, -5], [2, -5], [3, -5], [4, -5], [5, -5], [5, -4], [5, -3], [5, -2], [5, -1], [5, 0], [4, 1], [3, 2], [2, 3], [1, 4], [0, 5], [-1, 5], [-2, 5], [-3, 5], [-4, 5], [-5, 5], [-5, 4], [-5, 3], [-5, 2], [-5, 1], [-5, 0], [-4, -1], [-3, -2], [-2, -3], [-1, -4]]);
    }
    let voisins = [];
    for (i = 0; i < voisinsPossibles.length; i++) {
        let voisin = [position[0] + voisinsPossibles[i][0], position[1] + voisinsPossibles[i][1]];
        if (positionsPossibles.some(p => p[0] === voisin[0] && p[1] === voisin[1])) { // .includes ne suffit pas car les éléments sont des tableaux
            voisins.push(voisin);
        }
    }
    function seRapprocherDe(Objectif) {
        let positionCible = [...position]; // "..." : pour passer position en copie pour éviter que toutes les positions de l'espèce ne soient changées
        if (position[0] > Objectif[0]) {
            positionCible[0] -= 1;
        }
        if (position[0] < Objectif[0]) {
            positionCible[0] += 1;
        }
        if (position[1] > Objectif[1]) {
            positionCible[1] -= 1;
        }
        if (position[1] < Objectif[1]) {
            positionCible[1] += 1;
        }
        return positionCible;
    }
    console.log("je suis :");
    console.dir(c);
    if (reproductionPossible && tour - c.get("tourDernierEnfant") >= 5 && satiete >= 6.0 && hydratation >= 6.0 || c.get("veutSeReproduire")) { // priorité à la reproduction et la garder jusqu'à sa mort (faire un autre if au dessus pour savoir si on est deja dans une taniere si oui y rester)
        c.set("veutSeReproduire", true);
        but = seRapprocherDe(taniere); //
        caseObjectif = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);
        if (but[0] != taniere[0] && but[1] != taniere[1]) {
            if (caseObjectif.occupants.length == 1) {
                let voisinsDansRayon = voisins.filter(voisin => {
                    return Math.abs(voisin[0] - taniere[0]) <= 1 && Math.abs(voisin[1] - taniere[1]) <= 1;
                });

                let voisinVideLePlusProche = trouverVoisinVideLePlusProcheDeLaTaniere(voisinsDansRayon, cases, taniere);

                if (voisinVideLePlusProche !== null) {
                    but = voisinVideLePlusProche;
                }
            }
        }
    }
    else { //continuer d'augmenter ses fonctions (soit parce qu'on doit attendre le 3 eme tour soit parce qu'on est pas assez nourri)

        var casesEau = [];
        var casesPrairie = [];
        for (i = 0; i < voisins.length; i++) {
            let caseTest = cases.find(caseInfo => caseInfo.pos[0] === voisins[i][0] && caseInfo.pos[1] === voisins[i][1]); //on associe le voisin avec la case contenant les infos
            if (caseTest.couleur == "#3498DB") {
                casesEau.push(caseTest);          //lister cases eau
            }
            if (caseTest.couleur == "#8BC34A") {
                casesPrairie.push(caseTest);      //lister cases prairie
            }
        }

        if (casesEau.length >= 1 || casesPrairie.length >= 1) {    // alors on a des cases de ressources intéressantes
            if (casesEau.length >= 1) {
                caseObjectif = caseLaPlusProche(casesEau, position);
                but = seRapprocherDe(caseObjectif.pos);
                if (casesPrairie.length >= 1 && hydratation > satiete) {
                    caseObjectif = caseLaPlusProche(casesPrairie, position);
                    but = seRapprocherDe(caseObjectif.pos);
                }
            } else {
                caseObjectif = caseLaPlusProche(casesPrairie, position);
                but = seRapprocherDe(caseObjectif.pos);
            }
        }
        else {                                              // alors on en a pas et on se déplace au hasard dans un rayon de 1
            let voisinsDansRayon = voisins.filter(voisin => {
                return Math.abs(voisin[0] - position[0]) <= 1 && Math.abs(voisin[1] - position[1]) <= 1;
            });
            but = voisinsDansRayon[Math.floor(Math.random() * voisinsDansRayon.length)];
            caseObjectif = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);
        }
        if (caseObjectif.occupants.length == 1) { // il y a quelqu'un
            if (c.couleur == caseObjectif.occupants[0].couleur) { // S'ils sont de la même espèce
                if (caseObjectif.occupants[0].get("posActuelle")[0] == but[0] && caseObjectif.occupants[0].get("posActuelle")[1] == but[1]) { // si l'occupant est bien dans cette case (évite les erreurs de variable par adresse mémoire)
                    let casesLibres = voisins.filter(voisin => {
                        let caseVoisin = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
                        return caseVoisin.occupants.length === 0 && couleurs.indexOf(caseVoisin.couleur) === -1;
                    });

                    let casesEauLibres = casesLibres.filter(voisin => {
                        let caseVoisin = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
                        return caseVoisin.couleur === "#3498DB";
                    });
                    let casesPrairieLibres = casesLibres.filter(voisin => {
                        let caseVoisin = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
                        return caseVoisin.couleur === "#8BC34A";
                    });

                    let caseLibreChoisie;

                    if (casesEauLibres.length > 0 || casesPrairieLibres.length > 0) {
                        if (casesEauLibres.length >= 1) {
                            caseLibreChoisie = seRapprocherDe(positionLaPlusProche(casesEauLibres, position));
                            if (casesPrairie.length >= 1 && hydratation > satiete) {
                                
                                caseLibreChoisie = seRapprocherDe(positionLaPlusProche(casesPrairieLibres, position));
                                
                            }
                        } else {
                            caseLibreChoisie = seRapprocherDe(positionLaPlusProche(casesPrairieLibres, position));
                            
                            
                        }
                    } else {
                        caseLibreChoisie = positionLaPlusProche(casesLibres[Math.floor(Math.random() * casesLibres.length)], position);
                        
                    }

                    but = caseLibreChoisie;
                    caseObjectif = cases.find(caseInfo => caseInfo.pos[0] === caseLibreChoisie[0] && caseInfo.pos[1] === caseLibreChoisie[1]);
                    if (caseObjectif.occupants.length == 1) {
                       
                        but = position;
                        caseObjectif = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);
                    }
                }
            }
            else {
                // affrontement
            }
        }
    }
    return but;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function deplacerEtAgir(creatures, cases, io, tour) {
    for (let j = 0; j < creatures.length; j++) {

        let c = creatures[j];
        let taniere = c.get("taniere");
        let but = deplacer(c, tour);
        let nouvelleCase = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);

        let PositionCaseAVider = c.get("posActuelle");
        let caseAVider = cases.find(caseInfo => caseInfo.pos[0] === PositionCaseAVider[0] && caseInfo.pos[1] === PositionCaseAVider[1]);
        let satieteAvantPertes = c.get("satiete");
        let hydratationAvantPertes = c.get("hydratation");
        let sexe = c.get("sexe");
        let couleur = c.get("couleur");

        c.set("satiete", satieteAvantPertes - 0.5);
        c.set("hydratation", hydratationAvantPertes - 1);

        if (c.get("satiete") <= 0 || c.get("hydratation") <= 0) {
            io.emit('mort', { PositionCaseAVider: PositionCaseAVider, sexe: sexe });
            creatures.splice(j, 1);
        }
        else {
            let satieteApresPertes = c.get("satiete");
            let hydratationApresPertes = c.get("hydratation");
            if (nouvelleCase.couleur != couleur) {
                nouvelleCase.occupants.push(c);
                let indexDansOccupants = caseAVider.occupants.indexOf(c);
                caseAVider.occupants.splice(indexDansOccupants, 1);

                switch (nouvelleCase.couleur) {
                    case "#3498DB": // case eau
                        c.set("hydratation", hydratationApresPertes + 3);
                        break;
                    case "#8BC34A": // case prairie
                        c.set("satiete", satieteApresPertes + 2);
                        break;
                }

                let satieteApresGains = c.get("satiete");
                let hydratationApresGains = c.get("hydratation");

                io.emit("deplacer", { anciennePosition: PositionCaseAVider, nouvellePosition: but, sexe: sexe, couleur: couleur });
                c.set("posActuelle", but);
                console.log("fonctions vitales : SATIETE : " + satieteApresGains + ", HYDRATATION : " + hydratationApresGains);
            }
            else {
                if (nouvelleCase.occupants.indexOf(c) == -1) {
                    if (nouvelleCase.occupants.length == 0) {
                        console.log("je suis le premier à entrer");
                        console.log("\n");
                        nouvelleCase.occupants.push(c);
                        let indexDansOccupants = caseAVider.occupants.indexOf(c);
                        caseAVider.occupants.splice(indexDansOccupants, 1);
                        io.emit("deplacer", { anciennePosition: PositionCaseAVider, nouvellePosition: but, sexe: sexe, couleur: couleur });
                        c.set("posActuelle", but);
                    }
                    if (nouvelleCase.occupants.length == 1) {
                        if (nouvelleCase.occupants[0].get("sexe") != c.get("sexe")) {
                            console.log("je rejoins ma moitié");
                            nouvelleCase.occupants.push(c);
                            let indexDansOccupants = caseAVider.occupants.indexOf(c);
                            caseAVider.occupants.splice(indexDansOccupants, 1);

                            let voisinsRayon1 = [[0, 1], [0, -1], [1, 0], [1, -1], [-1, 0], [-1, 1]];
                            let voisinsTaniere = [];
                            for (let i = 0; i < voisinsRayon1.length; i++) {
                                let voisin = [taniere[0] + voisinsRayon1[i][0], taniere[1] + voisinsRayon1[i][1]];
                                let caseVoisine = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
                                if (positionsPossibles.some(p => p[0] === voisin[0] && p[1] === voisin[1])) {
                                    if (caseVoisine && caseVoisine.occupants.length == 0) {
                                        voisinsTaniere.push(voisin);
                                    }
                                }
                            }
                            console.log("case choisie pour l'enfant :");
                            let positionCaseLibre = voisinsTaniere[0];
                            console.log(positionCaseLibre);

                            let valeurAleatoire = Math.random();
                            let nouveauSexe = valeurAleatoire < 0.5 ? "M" : "F";
                            let nouvelleCreature = new Map();
                            nouvelleCreature.set("sexe", nouveauSexe);
                            nouvelleCreature.set("couleur", couleur);
                            nouvelleCreature.set("reproduction", c.get("reproduction"));
                            nouvelleCreature.set("perception", c.get("perception"));
                            nouvelleCreature.set("force", c.get("force"));
                            nouvelleCreature.set("satiete", 3.0);
                            nouvelleCreature.set("hydratation", 3.0);
                            nouvelleCreature.set("taniere", taniere);
                            nouvelleCreature.set("posActuelle", positionCaseLibre); // trouver quelle case de départ lui donner
                            nouvelleCreature.set("tourDernierEnfant", 0);
                            nouvelleCreature.set("veutSeReproduire", false);
                            creatures.push(nouvelleCreature);

                            // push dans la liste des occupants de la case dans laquelle elle apparait
                            io.emit("deplacer", { anciennePosition: PositionCaseAVider, nouvellePosition: but, sexe: sexe, couleur: couleur });
                            io.emit('reproduction', { couleur: couleur, positionCaseLibre: positionCaseLibre, sexe: sexe });
                            console.log("SE SONT REPRODUITS");
                            console.log("\n");

                            let caseDuConjoint = cases.find(caseInfo => caseInfo.pos[0] === taniere[0] && caseInfo.pos[1] === taniere[1]);
                            caseDuConjoint.occupants[0].set("tourDernierEnfant", tour);
                            caseDuConjoint.occupants[0].set("veutSeReproduire", false);

                            c.set("tourDernierEnfant", tour);
                            c.set("posActuelle", but);
                            c.set("veutSeReproduire", false);
                        }
                        else {
                            console.log("ils sont déjà 2 ou le sexe ne correspond pas");
                            console.log("\n");
                        }
                    }
                }
                else {
                    console.log("j'y suis déjà, j'attends");
                    console.log("\n");
                }
            }
        }
    }
}

async function partie() {
    for (let l = 0; l < 13; l++) {         // Génération des cases
        for (let c = 0; c < 13; c++) {
            let couleur = nbAleatoire();
            let caseInfo = {
                pos: [c, l],
                occupants: [],
                couleur: ''
            };
            switch (couleur) {
                case 1:
                    caseInfo.couleur = "#3498DB"; // eau
                    break;
                case 2:
                    caseInfo.couleur = "#8BC34A"; // prairie
                    break;
                case 3:
                    caseInfo.couleur = "#707B7C"; // rocher
                    break;
            }
            if (c == 0 && l == 6 && nbJoueurs >= 1) {   // si c'est une tanière on peint par dessus
                caseInfo.couleur = "#FF003B";
            }
            if (c == 12 && l == 6 && nbJoueurs >= 2) {
                caseInfo.couleur = "#C400FF";
            }
            if (c == 6 && l == 0 && nbJoueurs >= 3) {
                caseInfo.couleur = "#F1C40F";
            }
            if (c == 6 && l == 12 && nbJoueurs == 4) {
                caseInfo.couleur = "#FF8BF1";
            }
            cases.push(caseInfo);
        }
    }
    io.emit('cases', { 'cases': cases, 'nbJoueurs': nbJoueurs }); // envoi des informations du terrain
    for (i = 0; i < nbJoueurs; i++) { // création de la liste de créatures de chaque joueur
        let pos = [];
        let caseCourante;
        switch (i) {
            case 0:
                pos = [0, 6];
                break;
            case 1:
                pos = [12, 6];
                break;
            case 2:
                pos = [6, 0];
                break;
            case 3:
                pos = [6, 12];
                break;
        }
        caseCourante = cases.find(caseInfo => caseInfo.pos[0] === pos[0] && caseInfo.pos[1] === pos[1]);

        function creerCreature(sexe) {
            let creature = new Map();
            creature.set("sexe", sexe);
            creature.set("couleur", couleurs[i]);
            creature.set("reproduction", joueurs[i].get("reproduction"));
            creature.set("perception", joueurs[i].get("perception"));
            creature.set("force", joueurs[i].get("force"));
            creature.set("satiete", 3.0);
            creature.set("hydratation", 3.0);
            creature.set("taniere", pos);
            creature.set("posActuelle", pos);
            creature.set("tourDernierEnfant", 0);
            creature.set("veutSeReproduire", false);
            return creature;
        }
        toutesCréatures[i][0] = creerCreature("M");
        toutesCréatures[i][1] = creerCreature("F");
        taniereCorrespondante = cases.find(caseInfo => caseInfo.pos[0] === toutesCréatures[i][0].get("posActuelle")[0] && caseInfo.pos[1] === toutesCréatures[i][0].get("posActuelle")[1]); // trouver la case tanière correspondante à la créature
        taniereCorrespondante.occupants.push(toutesCréatures[i][0]); // pour lui ajouter les occupants Mâle
        taniereCorrespondante.occupants.push(toutesCréatures[i][1]); // et Femelle
    }
    io.emit('spawn', nbJoueurs);

    io.emit('messageServeur', "3..");
    await delay(1000); // Délai de 1 seconde avant le début de la partie
    io.emit('messageServeur', "2..");
    await delay(1000); // Délai de 1 seconde
    io.emit('messageServeur', "1..");
    await delay(1000); // Délai de 1 seconde
    io.emit('messageServeur', "La partie commence !")

    for (let i = 1; i <= nbTours; i++) {
        if (i === 3) {
            reproductionPossible = true;
        }
        console.log("tour : " + i);
        for (let creatures of toutesCréatures) {
            if (creatures.length > 0) {
                await deplacerEtAgir(creatures, cases, io, i);
                console.log("liste des créatures:");
                console.dir(creatures);
                console.log("\n");
                await delay(100); // Délai de 2 secondes entre chaque tour d'espèce
            }
        }
    }
    gagnant = 0;
    i = 0
    for (let i = 0; i < toutesCréatures; i++) {
        if (toutesCréatures[i].length > gagnant.length) {
            gagnant = i;
        }
    }
    io.emit('messageServeur', joueurs[i].get("name"));
}

io.on('connection', (socket) => {

    socket.on('creation', data => {
        console.log(data.nom + " crée la partie");
        let joueur = new Map();
        nbJoueurs = data.nbJoueurs;
        nbTours = data.nbTours;
        joueur.set("num", 0);
        joueur.set("name", data.nom);
        joueur.set("reproduction", data.reproduction);
        joueur.set("perception", data.perception);
        joueur.set("force", data.force);
        joueurs.push(joueur);
        if (data.nbJoueurs == 1) {
            jeton = 0;
            socket.emit('messageServeur', "La partie solo commence");
            partie();
        }
        else {
            socket.emit('messageServeur', "1/" + nbJoueurs + " joueurs. En attente...");
            socket.broadcast.emit('creation', joueur);
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
                joueurs.push(joueur);
                io.emit('messageServeur', joueurs.length + "/" + nbJoueurs + " joueurs. En attente...");
                if (joueurs.length == nbJoueurs) {
                    jeton = 0;
                    io.emit('messageServeur', 'La partie commence');
                    partie();
                }
                let nomsJoueurs = "";
                for (let joueur of joueurs) nomsJoueurs += joueur.get('name') + " ";
                socket.emit('entree', {
                    'nomJoueur': data.nom,
                    'numJoueur': joueurs.length - 1,
                    'nomsJoueurs': nomsJoueurs
                });
                if (joueurs.length > 1)
                    socket.broadcast.emit('entreeAutreJoueur',
                        {
                            'nomJoueur': data.nom,
                            'nomsJoueurs': nomsJoueurs
                        });
            }
            else socket.emit('messageServeur', 'Nom de joueur déjà enregistré');
        else socket.emit('messageServeur', 'Nombre de joueurs maximal déjà atteint !');
    });

    socket.on('sortie', nomJoueur => {
        console.log("Sortie de la partie de " + nomJoueur);
        let index = joueurs.indexOf(nomJoueur)
        if (index != -1) {
            joueurs.splice(index, 1);
            jeton = -1;
            let nomsJoueurs = "";
            for (let nom of joueurs) nomsJoueurs += nom + " ";
            socket.emit('sortie', {
                'nomJoueur': nomJoueur,
                'nomsJoueurs': nomsJoueurs
            });
            socket.broadcast.emit('sortieAutreJoueur',
                {
                    'nomJoueur': nomJoueur,
                    'numJoueur': 0,
                    'nomsJoueurs': nomsJoueurs
                });
        }
        else socket.emit('messageServeur', 'Joueur inconnu');
    });

    socket.on('demandeNbJoueurs', function () {
        socket.emit('nbJoueurs', { 'nombreMax': nbJoueurs, 'nbActuel': joueurs.length });
    });
});