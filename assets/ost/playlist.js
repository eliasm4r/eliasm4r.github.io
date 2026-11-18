/* =====================================================================
   PLAYLIST DU LECTEUR DE MUSIQUE (bouton 🎧 dans la carte du joueur)

   Pour ajouter un morceau :
   1. dépose ton fichier MP3 dans ce dossier (assets/ost/) ;
   2. ajoute une ligne ci-dessous, sur le modèle des autres.

   - title  : le nom affiché
   - artist : le jeu d'où vient le morceau (ex. 'Final Fantasy X')
   - src    : le chemin du fichier, depuis la racine du site
   - cover  : (facultatif) la jaquette du jeu, ex. 'assets/covers/ff10.jpg' ;
              sans cover, une pochette est générée avec le nom du jeu

   Le lecteur est éteint par défaut : rien ne se joue tant que le visiteur
   ne l'a pas allumé. Un fichier introuvable est simplement passé.
   ===================================================================== */
window.OST_PLAYLIST = [
    { title: 'Somnus', artist: 'Final Fantasy XV', src: 'assets/ost/Somnus (Instrumental Version).mp3', cover: 'assets/covers/ff15.jpg' },
    { title: 'Valse di Fantastica', artist: 'Final Fantasy XV', src: 'assets/ost/Valse di Fantastica (FINAL FANTASY XV Original Soundtrack) 【Audio】.mp3', cover: 'assets/covers/ff15.jpg' },
    { title: 'Noctis', artist: 'Final Fantasy XV', src: 'assets/ost/NOCTIS.mp3', cover: 'assets/covers/ff15.jpg' },
    { title: 'Sunset Waltz', artist: 'OST', src: 'assets/ost/Sunset Waltz.mp3' },
    { title: 'Calm Before the Storm', artist: 'Final Fantasy X', src: 'assets/ost/Calm Before The Storm (FINAL FANTASY X Original Soundtrack) 【Audio】.mp3' },
    {
        title: 'Stand By Me',
        artist: 'Florence + The Machine',
        src: 'assets/ending ost/Florence + The Machine - Stand By Me.mp3',
        cover: 'assets/covers/ff15.jpg',
    },
];

/* Musique des mini-jeux : elle ne joue QUE pendant le jeu concerné
   (le lecteur de musique se met en pause le temps de la partie).
   Clés possibles : fishing, cooking, chocobo, battle. */
window.OST_GAMES = {
    battle: 'assets/ost/Stand Your Ground.mp3',
    chocobo: 'assets/ost/FF7 chocobo Theme.mp3',
};
