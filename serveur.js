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
var jeton = -1;
var reproductionPossible = false;
var positionsPossibles = [];
for (l = 0; l < 13; l++) {
    for (c = 0; c < 13; c++) {
        positionsPossibles.push([c, l]);
    }
}

server.listen(9999, () => {
    console.log('Le serveur écoute sur le port 9999');
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

let caseObjectif;

function deplacer(c) {
    let taniere = c.get("taniere");
    let position = c.get("posActuelle");
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
    if (reproductionPossible && satiete >= 6.0) { // priorité à la reproduction et la garder jusqu'à sa mort (faire un autre if au dessus pour savoir si on est deja dans une taniere si oui y rester)
        but = seRapprocherDe(taniere); //
    }
    else { //continuer d'augmenter ses fonctions (soit parce qu'on doit attendre le 3 eme tour soit parce qu'on est pas assez nourri)
        function Distance(p1, p2) {
            const dx = p1[0] - p2[0];
            const dy = p1[1] - p2[1];
            if (dx === 0 && dy === 0) {
                return 0;
            }
            return Math.sqrt(dx * dx + dy * dy);
        }

        function caseLaPlusProche(listeCases) {
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
                console.log("je veux aller vers l'eau");
                caseObjectif = caseLaPlusProche(casesEau);
                but = seRapprocherDe(caseObjectif.pos);
                if (casesPrairie.length >= 1 && hydratation > satiete) {
                    console.log("je veux aller vers la prairie");
                    caseObjectif = caseLaPlusProche(casesPrairie);
                    but = seRapprocherDe(caseObjectif.pos);
                }
            } else {
                console.log("je veux aller vers la prairie");
                caseObjectif = caseLaPlusProche(casesPrairie);
                but = seRapprocherDe(caseObjectif.pos);
            }
        }
        else {                                              // alors on en a pas et on se déplace au hasard
            console.log("rien d'intéressant, je bouge aléatoirement");
            caseObjectif = voisins[Math.floor(Math.random() * voisins.length)];
        }
    }
    console.log("je vais vers la case : ");
    console.dir(caseObjectif);
    if (caseObjectif.occupants.length == 1 && couleurs.indexOf(caseObjectif.couleur) === -1) { // si il y a déjà quelqu'un et que la case n'est pas une tanière de quelque espèce que ce soit (si la couleur de la caseObjectif n'est pas parmi la liste des couleurs des tanières)
        // ça veut dire qu'on est sur une case roche prairie ou eau occupée
        //faire le test des deux forces et renvoyer le perdant dans un voisin aléatoire et attribuer ce voisin à caseObjectif et faire but = seRapprocherDe(caseObjectif)
        if (c.couleur == caseObjectif.occupants[0].couleur) { // S'ils sont de la même espèce
            console.log("Il y a un allié, je dois aller ailleurs. Voici les voisins libres");

            let casesLibres = voisins.filter(voisin => {
                let caseVoisin = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
                return caseVoisin.occupants.length === 0 && couleurs.indexOf(caseVoisin.couleur) === -1;
            });

            console.dir(casesLibres);

            let casesEauLibres = casesLibres.filter(voisin => {
                let caseVoisin = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
                return caseVoisin.couleur === "#3498DB";
            });
            let casesPrairieLibres = casesLibres.filter(voisin => {
                let caseVoisin = cases.find(caseInfo => caseInfo.pos[0] === voisin[0] && caseInfo.pos[1] === voisin[1]);
                return caseVoisin.couleur === "#8BC34A";
            });

            console.log("cases eau libres : ");
            console.dir(casesEauLibres);
            console.log("cases prairie libres : ");
            console.dir(casesPrairieLibres);

            let caseLibreChoisie;

            if (casesEauLibres.length > 0 || casesPrairieLibres.length > 0) { // S'il y a des cases eau parmi les voisins et que hydratation <= satiete, choisir aléatoirement les cases Eau
                if (casesEauLibres.length >= 1) {
                    console.log("je veux aller vers l'eau");
                    caseLibreChoisie = casesEauLibres[Math.floor(Math.random() * casesEauLibres.length)];
                    if (casesPrairie.length >= 1 && hydratation > satiete) {
                        console.log("je veux aller vers la prairie");
                        caseLibreChoisie = casesPrairieLibres[Math.floor(Math.random() * casesPrairieLibres.length)];
                    }
                } else {
                    console.log("je veux aller vers la prairie (y'a que ça en vue)");
                    caseLibreChoisie = casesPrairieLibres[Math.floor(Math.random() * casesPrairieLibres.length)];
                }
            }
            else{
                console.log("rien d'intéressant, je bouge aléatoirement");
                caseLibreChoisie = casesLibres[Math.floor(Math.random() * casesLibres.length)];
            }

            but = caseLibreChoisie;
            caseObjectif = cases.find(caseInfo => caseInfo.pos[0] === caseLibreChoisie[0] && caseInfo.pos[1] === caseLibreChoisie[1]);
            console.log("but : ");
            console.dir(but);
        } else {
            console.log("baston");
        }
    }
    let indiceCase = cases.findIndex(function (caseCourante) {
        return caseCourante.pos[0] == caseObjectif.pos[0] && caseCourante.pos[1] == caseObjectif.pos[1];
    });
    cases[indiceCase].occupants.push(c); // ajout de la créature dans la liste des occupants de sa caseObjectif
    console.log("ajout de la créature dans la liste des occupants");
    console.dir(cases[indiceCase]);
    return but;
}

function partie() {
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
            if (c == 0 && l == 6 && nbJoueurs == 1) {   // si c'est une tanière on peint par dessus
                caseInfo.couleur = "#FF003B";
            }
            if (c == 12 && l == 6 && nbJoueurs == 2) {
                caseInfo.couleur = "#C400FF";
            }
            if (c == 6 && l == 0 && nbJoueurs == 3) {
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
            return creature;
        }
        toutesCréatures[i][0] = creerCreature("M");
        toutesCréatures[i][1] = creerCreature("F");
        taniereCorrespondante = cases.find(caseInfo => caseInfo.pos[0] === toutesCréatures[i][0].get("posActuelle")[0] && caseInfo.pos[1] === toutesCréatures[i][0].get("posActuelle")[1]); // trouver la case tanière correspondante à la créature
        taniereCorrespondante.occupants.push(toutesCréatures[i][0]); // pour lui ajouter les occupants Mâle
        taniereCorrespondante.occupants.push(toutesCréatures[i][1]); // et Femelle
    }
    io.emit('spawn', nbJoueurs);
    //attendre 3 sec
    for (i = 1; i <= nbTours; i++) {
        if (i == 3) {
            reproductionPossible = true;
        }
        for (j = 0; j < c1.length; j++) {
            let but = deplacer(c1[j]);
            let nouvelleCase = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);
            let PositionCaseAVider = c1[j].get("posActuelle");
            let caseAVider = cases.find(caseInfo => caseInfo.pos[0] === PositionCaseAVider[0] && caseInfo.pos[1] === PositionCaseAVider[1]);
            let satiete = c1[j].get("satiete");
            let hydratation = c1[j].get("hydratation");
            let sexe = c1[j].get("sexe");
            let couleur = c1[j].get("couleur");
            switch (nouvelleCase.couleur) {
                case "#3498DB": // case eau
                    c1[j].set("hydratation", hydratation + 3);
                    break;
                case "#8BC34A": // case prairie
                    c1[j].set("satiete", satiete + 2);
                    break;
                case "#FF003B": // tanière
                    if (nouvelleCase.nbOccupants == 1 && nouvelleCase.occupants != sexe && i - c1[j].get("tourDernierEnfant") > 5) {
                        reprodution(c1[j], nouvelleCase.occupants);
                        io.emit('reproduction', couleur);
                        c1[j].set("tourDernierEnfant", i);
                    }
                    else {
                        nouvelleCase.nbOccupants = 1;
                        nouvelleCase.occupants = c1[j];
                    }
            }
            c1[j].set("satiete", satiete - 0.5); // altération des fonctions vitales
            c1[j].set("hydratation", hydratation - 1);
            indexDansOccupants = caseAVider.occupants.indexOf(c1[j]); // on recherche la créature dans la liste des occupants de la case sur laquelle elle est
            caseAVider.occupants.splice(indexDansOccupants, 1); // on l'enlève de cette liste
            io.emit("deplacer", { anciennePosition: PositionCaseAVider, nouvellePosition: but, sexe: sexe, couleur: couleur });
            c1[j].set("posActuelle", but); // on le déplace
            if (satiete <= 0 || hydratation <= 0) {
                io.emit('mort', c1[j]);
                c1.splice(j, 1);
            }
            // reproduction : si tourDernierEnfant == 0 => peut se reproduire direct sinon comparer au tour actuel et vérifier que tourActuel - tourDernierEnfant > 5
            // s'occuper de concurrence pour une case directement dans la fonmction deplacer enregistrer l'occupants dans la case occupée
        }
        //attendre 1 sec
        jeton++;
        if (jeton == joueurs.length) {
            jeton = 0;
        }
        else {
            for (j = 0; j < c2.length; j++) {
                let but = deplacer(c2[j]);
                let nouvelleCase = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);
                let PositionCaseAVider = c2[j].get("posActuelle");
                let caseAVider = cases.find(caseInfo => caseInfo.pos[0] === PositionCaseAVider[0] && caseInfo.pos[1] === PositionCaseAVider[1]);
                let satiete = c2[j].get("satiete");
                let hydratation = c2[j].get("hydratation");
                let sexe = c2[j].get("sexe");
                let couleur = c2[j].get("couleur");
                switch (nouvelleCase.couleur) {
                    case "#3498DB": // case eau
                        c2[j].set("hydratation", hydratation + 3);
                        break;
                    case "#8BC34A": // case prairie
                        c2[j].set("satiete", satiete + 2);
                        break;
                    case "#FF003B": // tanière
                        if (nouvelleCase.nbOccupants == 1 && nouvelleCase.occupants != sexe && i - c2[j].get("tourDernierEnfant") > 5) {
                            reprodution(c2[j], nouvelleCase.occupants);
                            io.emit('reproduction', couleur);
                            c2[j].set("tourDernierEnfant", i);
                        }
                        else {
                            nouvelleCase.nbOccupants = 1;
                            nouvelleCase.occupants = c2[j];
                        }
                }
                c2[j].set("satiete", satiete - 0.5); // altération des fonctions vitales
                c2[j].set("hydratation", hydratation - 1);
                indexDansOccupants = caseAVider.occupants.indexOf(c2[j]); // on recherche la créature dans la liste des occupants de la case sur laquelle elle est
                caseAVider.occupants.splice(indexDansOccupants, 1); // on l'enlève de cette liste
                io.emit("deplacer", { anciennePosition: PositionCaseAVider, nouvellePosition: but, sexe: sexe, couleur: couleur });
                c2[j].set("posActuelle", but); // on le déplace
                if (satiete <= 0 || hydratation <= 0) {
                    io.emit('mort', c2[j]);
                    c2.splice(j, 1);
                }
                // reproduction : si tourDernierEnfant == 0 => peut se reproduire direct sinon comparer au tour actuel et vérifier que tourActuel - tourDernierEnfant > 5
                // s'occuper de concurrence pour une case directement dans la fonmction deplacer enregistrer l'occupants dans la case occupée
            }
            //attendre 1 sec
            jeton++;
            if (jeton == joueurs.length) {
                jeton = 0;
            }
            else {
                for (j = 0; j < c3.length; j++) {
                    let but = deplacer(c3[j]);
                    let nouvelleCase = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);
                    let PositionCaseAVider = c3[j].get("posActuelle");
                    let caseAVider = cases.find(caseInfo => caseInfo.pos[0] === PositionCaseAVider[0] && caseInfo.pos[1] === PositionCaseAVider[1]);
                    let satiete = c3[j].get("satiete");
                    let hydratation = c3[j].get("hydratation");
                    let sexe = c3[j].get("sexe");
                    let couleur = c3[j].get("couleur");
                    switch (nouvelleCase.couleur) {
                        case "#3498DB": // case eau
                            c3[j].set("hydratation", hydratation + 3);
                            break;
                        case "#8BC34A": // case prairie
                            c3[j].set("satiete", satiete + 2);
                            break;
                        case "#FF003B": // tanière
                            if (nouvelleCase.nbOccupants == 1 && nouvelleCase.occupants != sexe && i - c3[j].get("tourDernierEnfant") > 5) {
                                reprodution(c3[j], nouvelleCase.occupants);
                                io.emit('reproduction', couleur);
                                c3[j].set("tourDernierEnfant", i);
                            }
                            else {
                                nouvelleCase.nbOccupants = 1;
                                nouvelleCase.occupants = c3[j];
                            }
                    }
                    c3[j].set("satiete", satiete - 0.5); // altération des fonctions vitales
                    c3[j].set("hydratation", hydratation - 1);
                    indexDansOccupants = caseAVider.occupants.indexOf(c3[j]); // on recherche la créature dans la liste des occupants de la case sur laquelle elle est
                    caseAVider.occupants.splice(indexDansOccupants, 1); // on l'enlève de cette liste
                    io.emit("deplacer", { anciennePosition: PositionCaseAVider, nouvellePosition: but, sexe: sexe, couleur: couleur });
                    c3[j].set("posActuelle", but); // on le déplace
                    if (satiete <= 0 || hydratation <= 0) {
                        io.emit('mort', c3[j]);
                        c3.splice(j, 1);
                    }
                    // reproduction : si tourDernierEnfant == 0 => peut se reproduire direct sinon comparer au tour actuel et vérifier que tourActuel - tourDernierEnfant > 5
                    // s'occuper de concurrence pour une case directement dans la fonmction deplacer enregistrer l'occupants dans la case occupée
                }
                jeton++;
                if (jeton == joueurs.length) {
                    jeton = 0;
                }
                else {
                    for (j = 0; j < c4.length; j++) {
                        let but = deplacer(c4[j]);
                        let nouvelleCase = cases.find(caseInfo => caseInfo.pos[0] === but[0] && caseInfo.pos[1] === but[1]);
                        let PositionCaseAVider = c4[j].get("posActuelle");
                        let caseAVider = cases.find(caseInfo => caseInfo.pos[0] === PositionCaseAVider[0] && caseInfo.pos[1] === PositionCaseAVider[1]);
                        let satiete = c4[j].get("satiete");
                        let hydratation = c4[j].get("hydratation");
                        let sexe = c4[j].get("sexe");
                        let couleur = c4[j].get("couleur");
                        switch (nouvelleCase.couleur) {
                            case "#3498DB": // case eau
                                c4[j].set("hydratation", hydratation + 3);
                                break;
                            case "#8BC34A": // case prairie
                                c4[j].set("satiete", satiete + 2);
                                break;
                            case "#FF003B": // tanière
                                if (nouvelleCase.nbOccupants == 1 && nouvelleCase.occupants != sexe && i - c4[j].get("tourDernierEnfant") > 5) {
                                    reprodution(c4[j], nouvelleCase.occupants);
                                    io.emit('reproduction', couleur);
                                    c4[j].set("tourDernierEnfant", i);
                                }
                                else {
                                    nouvelleCase.nbOccupants = 1;
                                    nouvelleCase.occupants = c4[j];
                                }
                        }
                        c4[j].set("satiete", satiete - 0.5); // altération des fonctions vitales
                        c4[j].set("hydratation", hydratation - 1);
                        indexDansOccupants = caseAVider.occupants.indexOf(c4[j]); // on recherche la créature dans la liste des occupants de la case sur laquelle elle est
                        caseAVider.occupants.splice(indexDansOccupants, 1); // on l'enlève de cette liste
                        io.emit("deplacer", { anciennePosition: PositionCaseAVider, nouvellePosition: but, sexe: sexe, couleur: couleur });
                        c4[j].set("posActuelle", but); // on le déplace
                        if (satiete <= 0 || hydratation <= 0) {
                            io.emit('mort', c4[j]);
                            c4.splice(j, 1);
                        }
                        // reproduction : si tourDernierEnfant == 0 => peut se reproduire direct sinon comparer au tour actuel et vérifier que tourActuel - tourDernierEnfant > 5
                        // s'occuper de concurrence pour une case directement dans la fonmction deplacer enregistrer l'occupants dans la case occupée
                    }
                    //attendre 1 sec
                    jeton = 0;
                }
            }
        }
        //la dernière espèce en vie gagne
    }
    //l'espèce avec la plus grande population gagne
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