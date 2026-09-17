# Meiro

Site de marque React + TypeScript + Vite. Contenu visiteur en mongol, logo SVG fourni conservé sans modification et aucune image générée.

## Démarrage

```sh
npm install
npm run dev
```

Le serveur local est disponible sur http://localhost:5173.

```sh
npm run build
npm run preview
npm test
```

Les tests utilisent le support TypeScript natif de Node 22.18+ (ou Node 24+).

## Organisation

- `src/pages/` : accueil, catalogue, détail produit, contact et page 404.
- `src/components/` : navigation, footer, placeholders, cartes produit et carousel.
- `src/data/products.ts` : données temporaires typées, catégories, variantes et prix en MNT.
- `src/data/site.ts` : navigation et liens sociaux officiels.
- `src/services/contact.ts` : adaptateur vers le futur service d'envoi.
- `src/commerce/` : contrats pour panier, checkout et paiement ; stockage local versionné.
- `src/styles.css` : palette, typographie, styles responsive et réduction des animations.

## Photographies et produits définitifs

Tous les rectangles portent `IMAGE` et une description photographique en mongol. Le composant `ImagePlaceholder` conserve le ratio prévu pour chaque emplacement. Remplacer son contenu par une image avec `object-fit: cover` et un texte alternatif décrivant la véritable photo. Le logo original est dans `public/meiro-logo.svg`.

Les six produits sont des exemples (`isPlaceholder: true`, `availability: 'preview'`). Les prix restent `null`, affichés comme à venir. Remplacer les données et confirmer les noms, descriptions, prix, variantes et stocks avant toute activation des achats. Aucun bouton de paiement ni commande factice n'est présenté.

## Formulaire

Sans `VITE_CONTACT_ENDPOINT`, l'envoi est désactivé et le visiteur est orienté vers les réseaux sociaux. Les champs restent consultables. Pour activer l'envoi :

1. Créer un endpoint backend qui valide les champs, limite les abus et envoie réellement le message.
2. Copier `.env.example` en `.env.local` et renseigner le chemin de cet endpoint.
3. Retourner un code 2xx uniquement après acceptation effective du message. Recompiler le frontend.

Le corps JSON contient `name`, `contact`, `subject` et `message`. Les secrets du fournisseur d'envoi doivent rester côté serveur. Aucun message ou donnée personnelle n'est enregistré dans le navigateur.

## Extension commerce / QPay

L'interface `CheckoutService` constitue un point d'intégration futur, pas une implémentation QPay. Les helpers de panier sont testés mais ne sont pas exposés aux visiteurs pendant la phase de présentation.

Pour activer le commerce : ajouter un contexte panier et son interface ; relier `loadCart` / `saveCart` ; vérifier la disponibilité des articles au chargement ; créer un backend de commandes et implémenter le contrat de checkout. Le serveur devra recalculer les montants depuis une source fiable, contrôler les stocks, créer les factures via l'API officielle QPay et vérifier les paiements côté serveur avec traitement idempotent des notifications. Ne jamais placer de secrets QPay dans des variables `VITE_*`. Les variantes et la quantité du panier ne doivent pas être considérées comme fiables sans validation serveur.

## Déploiement

Publier le dossier `dist/` sur un hébergement statique avec fallback SPA vers `index.html`, nécessaire pour ouvrir directement `/catalogue`, `/catalogue/:slug` et `/contact`. Les routes `/api/*` doivent être servies par le backend, sans fallback HTML. Le fichier `public/_redirects` fournit le fallback pour les hébergeurs compatibles.

Alegreya et Manrope sont chargées via Google Fonts ; des polices système prennent le relais hors connexion. Pour une production sans dépendance à Google Fonts, héberger les fichiers WOFF2 incluant le cyrillique et mettre à jour les déclarations de polices.
