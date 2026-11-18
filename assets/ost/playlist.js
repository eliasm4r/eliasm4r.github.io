/* =====================================================================
   PLAYLIST DU LECTEUR DE MUSIQUE (bouton 🎧 dans la carte du joueur)

   Pour ajouter un morceau :
   1. dépose ton fichier MP3 dans ce dossier (assets/ost/) ;
   2. ajoute une ligne ci-dessous, sur le modèle des autres.

   - title  : le nom affiché
   - artist : le compositeur, l'interprète ou le jeu
   - src    : le chemin du fichier, depuis la racine du site
   - cover  : (facultatif) une image carrée ou une jaquette ; sinon celle de FF15

   Le lecteur est éteint par défaut : rien ne se joue tant que le visiteur
   ne l'a pas allumé. Un fichier introuvable est simplement passé.
   ===================================================================== */
window.OST_PLAYLIST = [
    { title: 'Somnus', artist: 'Final Fantasy XV', src: 'assets/ost/Somnus (Instrumental Version).mp3' },
    { title: 'Valse di Fantastica', artist: 'Final Fantasy XV', src: 'assets/ost/Valse di Fantastica (FINAL FANTASY XV Original Soundtrack) 【Audio】.mp3' },
    { title: 'Noctis', artist: 'Final Fantasy XV', src: 'assets/ost/NOCTIS.mp3' },
    { title: 'Stand Your Ground', artist: 'Final Fantasy XV', src: 'assets/ost/Stand Your Ground.mp3' },
    { title: 'Sunset Waltz', artist: 'OST', src: 'assets/ost/Sunset Waltz.mp3' },
    { title: 'Calm Before the Storm', artist: 'Final Fantasy X', src: 'assets/ost/Calm Before The Storm (FINAL FANTASY X Original Soundtrack) 【Audio】.mp3' },
    { title: 'Chocobo Theme', artist: 'Final Fantasy VII', src: 'assets/ost/FF7 chocobo Theme.mp3' },
    {
        title: 'Stand By Me',
        artist: 'Florence + The Machine',
        src: 'assets/ending ost/Florence + The Machine - Stand By Me.mp3',
        cover: 'assets/covers/ff15.jpg',
    },
];

/* Musique des mini-jeux : jouée pendant la partie (le lecteur se met en pause).
   À brancher avec la refonte de la Chocobo Race et des combats. */
window.OST_GAMES = {
    battle: 'assets/ost/Stand Your Ground.mp3',
    chocobo: 'assets/ost/FF7 chocobo Theme.mp3',
};
