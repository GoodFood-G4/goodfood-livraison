import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeoPoint } from '../../../shared/domain/geo-point';
import { Geocoder, GeocodeQuery } from '../../domain/geocoder.port';

interface NominatimResult {
  lat: string;
  lon: string;
}

const TIMEOUT_MS = 5000;
const MIN_INTERVAL_MS = 1000;

/**
 * Adaptateur OpenStreetMap/Nominatim. Respecte la politique d'usage (1 req/s,
 * User-Agent obligatoire). Les échecs réseau ou l'absence de résultat
 * retournent `null`, jamais une exception : au use case de décider.
 */
@Injectable()
export class NominatimGeocoder implements Geocoder {
  private readonly logger = new Logger(NominatimGeocoder.name);
  private queue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(private readonly configService: ConfigService) {}

  async geocode(query: GeocodeQuery): Promise<GeoPoint | null> {
    return this.enqueue(() => this.performGeocode(query));
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => this.throttle()).then(task);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const waitMs = MIN_INTERVAL_MS - elapsed;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.lastRequestAt = Date.now();
  }

  private async performGeocode(query: GeocodeQuery): Promise<GeoPoint | null> {
    const baseUrl = this.configService.get<string>('nominatimBaseUrl', '');
    const userAgent = this.configService.get<string>('nominatimUserAgent', '');
    const url = new URL('/search', baseUrl);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('street', query.street);
    url.searchParams.set('postalcode', query.postalCode);
    url.searchParams.set('city', query.city);
    url.searchParams.set('country', query.country);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': userAgent },
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `Nominatim a répondu avec le statut ${response.status}`,
        );
        return null;
      }

      const results = (await response.json()) as NominatimResult[];
      if (results.length === 0) {
        return null;
      }

      return GeoPoint.create(
        parseFloat(results[0].lat),
        parseFloat(results[0].lon),
      );
    } catch (error) {
      this.logger.warn(
        `Échec du géocodage Nominatim : ${(error as Error).message}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
