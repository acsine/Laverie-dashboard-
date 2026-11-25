const PRODUCTION = process.env.NODE_ENV === "production";

/** Texte détaillé réservé au dev ; message neutre en production (affiché au client). */
export function userFacingMessage(devDetail: string, productionMessage: string): string {
  return PRODUCTION ? productionMessage : devDetail;
}

export const INVALID_CREDENTIALS_PUBLIC = "E-mail ou mot de passe incorrect.";

export const PLATFORM_ACTION_DENIED_PUBLIC =
  "Action non autorisée. Vérifiez votre connexion ou contactez l'administrateur.";