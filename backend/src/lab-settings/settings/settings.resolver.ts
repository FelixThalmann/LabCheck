import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SettingsService } from './settings.service';
import { LabSettingModel } from '../graphql/lab-setting.model'; // Korrekter Pfad zum GraphQL-Modell
// Importiere UseGuards und JwtAuthGuard, wenn Authentifizierung implementiert wird
// import { UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Pfad anpassen

@Resolver(() => LabSettingModel)
export class SettingsResolver {
  constructor(private readonly settingsService: SettingsService) {}

  @Query(() => Int, { name: 'getLabCapacity', description: 'Ruft die aktuell konfigurierte Gesamtkapazität des Labors ab.' })
  async getLabCapacity(): Promise<number> {
    return this.settingsService.getLabCapacity();
  }

  // @UseGuards(JwtAuthGuard) // Wird in Phase 4 aktiviert
  @Mutation(() => LabSettingModel, { name: 'setLabCapacity', description: 'Setzt die Gesamtkapazität des Labors.' })
  async setLabCapacity(
    @Args('capacity', { type: () => Int, description: 'Die neue Gesamtkapazität des Labors.' }) capacity: number,
  ): Promise<LabSettingModel> {
    // Prisma gibt das volle LabSetting-Objekt zurück. Wir müssen es ggf. auf LabSettingModel mappen,
    // aber für einfache Fälle passt es oft direkt, wenn die Felder übereinstimmen.
    // Wenn nicht, hier eine manuelle Konvertierung oder class-transformer verwenden.
    const labSetting = await this.settingsService.setLabCapacity(capacity);
    return {
        key: labSetting.key,
        value: labSetting.value,
        notes: labSetting.notes === null ? undefined : labSetting.notes,
        createdAt: labSetting.createdAt,
        updatedAt: labSetting.updatedAt
    };
  }

  // Optional: Allgemeine Getter/Setter für Settings, falls benötigt
  @Query(() => LabSettingModel, { name: 'getLabSetting', nullable: true })
  async getSetting(@Args('key') key: string) {
    const labSetting = await this.settingsService.getSetting(key);
    if (!labSetting) return null;
    return {
        ...labSetting,
        notes: labSetting.notes === null ? undefined : labSetting.notes,
    };
  }

  // @UseGuards(JwtAuthGuard)
  @Mutation(() => LabSettingModel, { name: 'setLabSetting' })
  async setSetting(@Args('key') key: string, @Args('value') value: string) {
    const labSetting = await this.settingsService.setSetting(key, value);
    return {
        ...labSetting,
        notes: labSetting.notes === null ? undefined : labSetting.notes,
    };
  }
}
