import { Redirect } from 'expo-router';

/** Ancienne route modale : l’accueil principal affiche désormais les thèmes. */
export default function ExplorerRedirect() {
  return <Redirect href="/(tabs)" />;
}
