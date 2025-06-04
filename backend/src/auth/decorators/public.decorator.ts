import { SetMetadata } from '@nestjs/common';

/**
 * Schlüssel für die Metadaten, um öffentliche Routen zu identifizieren.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator, um einen Endpunkt als öffentlich zu markieren.
 * Öffentliche Endpunkte umgehen die globale JWT-Authentifizierung.
 * @returns Ein Metadaten-Decorator.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true); 