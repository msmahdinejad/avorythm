# Présentation Chrome Web Store — Français

## Nom

Avorythm — Doublage et sous-titres en direct par IA

## Description courte

Traduisez l’audio d’un onglet par IA : doublage en direct, sous-titres bilingues, mixage indépendant et lecture synchronisée.

## Description détaillée

Regardez des cours, des vidéos et des films, ou écoutez des podcasts dans votre langue. Avorythm utilise l’IA pour traduire l’audio de l’onglet que vous choisissez vous-même. Écoutez le doublage en direct, affichez les sous-titres d’origine et leur traduction, ou conservez le son original et lisez simplement le texte traduit.

L’extension propose 79 langues cibles, dont le français, l’anglais, le persan, l’arabe, le chinois simplifié et traditionnel, l’allemand, l’italien, l’espagnol, le russe, le japonais, le coréen, le turc, le portugais, l’hindi, l’ourdou et bien d’autres.

Choisissez votre mode de lecture :

- Sur cette page : le parcours à faible latence pour l’audio et les sous-titres en direct.
- Enregistreur et lecteur synchronisés : l’enregistrement prend de l’avance sur le visionnage. Le lecteur indépendant permet de mettre en pause, d’avancer, de revenir en arrière et de passer en plein écran. Vous pouvez terminer l’enregistrement manuellement à tout moment.

L’audio d’origine, le doublage, les sous-titres d’origine et les sous-titres traduits sont quatre canaux indépendants. Combinez-les librement, réglez les deux volumes et déplacez ou redimensionnez la fenêtre des sous-titres. Exportez la vidéo enregistrée en WebM avec le mixage choisi et des fichiers SRT séparés. L’enregistrement classique facultatif permet aussi de sauvegarder les deux pistes audio au format WAV et les deux pistes de sous-titres au format SRT.

L’extension est autonome : pas besoin d’application de bureau, de Python, de FFmpeg, de localhost ni de périphérique audio virtuel. L’interface actuelle est disponible en anglais, en persan et en chinois simplifié. La langue de traduction se choisit indépendamment.

Pour commencer, saisissez votre propre clé API Gemini de Google AI Studio dans les paramètres, autorisez explicitement l’envoi de l’audio de l’onglet sélectionné à Google Gemini, choisissez une langue et cliquez sur Démarrer. Le parcours précis facultatif utilise Groq Whisper pour la transcription, Gemini pour la traduction du texte et Gemini 3.1 Flash Live pour générer la voix. Il nécessite une clé Groq, une autorisation facultative pour les sites (permission d’hôte) et un consentement distinct pour le traitement audio.

Confidentialité : la capture ne commence qu’après votre consentement et un clic sur Démarrer. L’audio et les transcriptions de l’onglet choisi sont envoyés directement aux services d’IA nécessaires, jamais au développeur d’Avorythm. Il n’y a ni publicité, ni outil d’analyse, ni serveur relais exploité par le développeur. Par défaut, les clés ne sont conservées que pour la session du navigateur. Vous pouvez choisir de mémoriser séparément chaque clé sur cet appareil. Les copies enregistrées ne sont ni synchronisées ni chiffrées par l’extension. Désactiver cette option supprime la copie locale ; effacer une clé supprime à la fois la copie locale et celle de la session.

L’enregistrement classique des quatre sorties est désactivé par défaut. Le mode synchronisé enregistre localement pour la lecture et l’exportation, et ne conserve que le dernier enregistrement dans le stockage privé de Chrome. Les fichiers téléchargés sont placés dans Downloads/Avorythm.

Avorythm est gratuit et open source. Les quotas gratuits et les modèles disponibles chez les fournisseurs externes peuvent évoluer. Le traitement en direct nécessite du temps réseau et ne garantit ni une latence nulle ni des traductions parfaites. Vérifiez les contenus importants. Les médias protégés par DRM et les pages internes du navigateur peuvent empêcher la capture.

Code source : https://github.com/msmahdinejad/avorythm

Guide complet en anglais : https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Politique de confidentialité : https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Nouveautés de la version 1.1.16

- Sélection des langues facilitée, avec les langues courantes en premier et des variantes chinoises et portugaises clairement identifiées.
- Documentation et ressources du projet en allemand, français, italien, russe et arabe.
- Visuels du Store renouvelés à partir de l’interface réelle du produit.
