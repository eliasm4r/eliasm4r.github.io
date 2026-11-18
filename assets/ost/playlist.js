/* =====================================================================
   PLAYLIST DU LECTEUR DE MUSIQUE (bouton 🎧 dans la carte du joueur)

   Pour ajouter un morceau :
   1. dépose ton fichier MP3 dans ce dossier (assets/ost/) ;
   2. ajoute une ligne ci-dessous, sur le modèle des exemples.

   - title  : le nom affiché
   - artist : le compositeur ou l'interprète
   - src    : le chemin du fichier, depuis la racine du site
   - cover  : (facultatif) une image carrée ou une jaquette ; sinon celle de FF15

   Le lecteur est éteint par défaut : rien ne se joue tant que le visiteur
   ne l'a pas allumé. Un fichier introuvable est simplement passé.
   ===================================================================== */
window.OST_PLAYLIST = [
    {
        title: 'Stand By Me',
        artist: 'Florence + The Machine',
        src: 'assets/ending ost/Florence + The Machine - Stand By Me.mp3',
        cover: 'assets/covers/ff15.jpg',
    },
    // { title: 'Somnus', artist: 'Yoko Shimomura', src: 'assets/ost/somnus.mp3' },
    // { title: 'Valse di Fantastica', artist: 'Yoko Shimomura', src: 'assets/ost/valse-di-fantastica.mp3' },
    // { title: 'Apocalypsis Noctis', artist: 'Yoko Shimomura', src: 'assets/ost/apocalypsis-noctis.mp3' },
];
