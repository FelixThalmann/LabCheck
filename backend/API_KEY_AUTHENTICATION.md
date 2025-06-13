# API-Key Authentifizierung - LabCheck Backend

## 📋 Übersicht

Das LabCheck Backend verwendet **API-Key Authentifizierung** für die REST API Endpunkte. Diese Dokumentation erklärt woher der API-Key kommt und wie das System funktioniert.

## 🔑 Woher kommt der API-Key?

### **1. Umgebungsvariable STATIC_API_KEY**

Der API-Key wird in der `.env` Datei als Umgebungsvariable definiert:

```bash
# .env Datei
STATIC_API_KEY=your-secret-api-key-here
ADMIN_PASSWORD=admin123
```

### **2. ApiKeyAuthGuard Implementation**

**Datei:** `backend/src/auth/guards/api-key-auth.guard.ts`

```typescript
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {
    // Lädt STATIC_API_KEY aus Umgebungsvariablen
    this.expectedApiKey = this.configService.get<string>('STATIC_API_KEY');
  }

  canActivate(context: ExecutionContext): boolean {
    // Extrahiert API-Key aus Request Header
    const apiKey = request.headers['x-api-key'];
    
    // Vergleicht mit erwarteten API-Key
    return apiKey === this.expectedApiKey;
  }
}
```

### **3. Globale Aktivierung**

**Datei:** `backend/src/app.module.ts`

```typescript
@Module({
  providers: [
    {
      provide: APP_GUARD,           // Globaler Guard
      useClass: ApiKeyAuthGuard,    // Für alle Endpunkte aktiv
    },
  ],
})
```

## 🔧 Wie funktioniert die Authentifizierung?

### **Client-Anfrage:**
```bash
curl -H "X-API-Key: your-secret-api-key-here" \
     http://localhost:3000/api/lab/status
```

### **Server-Validierung:**
1. **Header-Extraktion:** `X-API-Key` aus Request Headers
2. **Vergleich:** Header-Wert vs. `STATIC_API_KEY` aus `.env`
3. **Ergebnis:** 
   - ✅ **Gültig:** Zugriff gewährt
   - ❌ **Ungültig:** `401 Unauthorized`

### **Public Endpunkte:**
```typescript
@Public()  // Decorator für öffentliche Endpunkte
@Get('health')
async getHealth() {
  return { status: 'ok' };
}
```

## 🚫 Aktuelle Deaktivierung

### **Status: Authentifizierung temporär deaktiviert**

**Grund:** Fehlende Umgebungsvariablen verursachten Startup-Fehler:
- `STATIC_API_KEY` nicht definiert
- `JWT_SECRET` nicht definiert (für JwtStrategy)

### **Deaktivierte Komponenten:**

#### **1. Globaler Guard deaktiviert:**
```typescript
// backend/src/app.module.ts
providers: [
  AppService,
  // Authentifizierung temporär deaktiviert
  // {
  //   provide: APP_GUARD,
  //   useClass: ApiKeyAuthGuard,
  // },
],
```

#### **2. JWT/Local Strategien deaktiviert:**
```typescript
// backend/src/auth/auth.module.ts
providers: [
  AuthService, 
  // LocalStrategy, // Temporär deaktiviert
  // JwtStrategy,   // Temporär deaktiviert - verursacht Fehler ohne JWT_SECRET
  ApiKeyAuthGuard
],
```

## 🔄 Reaktivierung der Authentifizierung

### **Schritt 1: Umgebungsvariablen setzen**

```bash
# .env Datei erstellen/erweitern
STATIC_API_KEY=labcheck-secret-api-key-2024
ADMIN_PASSWORD=admin123
JWT_SECRET=your-jwt-secret-here  # Falls JWT später benötigt
```

### **Schritt 2: Globalen Guard aktivieren**

```typescript
// backend/src/app.module.ts
providers: [
  AppService,
  {
    provide: APP_GUARD,
    useClass: ApiKeyAuthGuard,  // Wieder aktivieren
  },
],
```

### **Schritt 3: Strategien aktivieren (optional)**

```typescript
// backend/src/auth/auth.module.ts
providers: [
  AuthService, 
  LocalStrategy,  // Wieder aktivieren falls benötigt
  JwtStrategy,    // Wieder aktivieren falls benötigt
  ApiKeyAuthGuard
],
```

## 🧪 Testing mit API-Key

### **Mit Authentifizierung:**
```bash
# Erfolgreiche Anfrage
curl -H "X-API-Key: labcheck-secret-api-key-2024" \
     http://localhost:3000/api/lab/status

# Fehlgeschlagene Anfrage (ohne Key)
curl http://localhost:3000/api/lab/status
# → 401 Unauthorized
```

### **Ohne Authentifizierung (aktuell):**
```bash
# Funktioniert ohne API-Key
curl http://localhost:3000/api/lab/status
```

## 📊 Swagger-Dokumentation

### **Mit API-Key:**
- **URL:** `http://localhost:3000/api/docs`
- **Authorize Button:** API-Key eingeben
- **Header:** `X-API-Key: your-key-here`

### **API-Key in Swagger konfiguriert:**
```typescript
// backend/src/main.ts
const config = new DocumentBuilder()
  .addApiKey(
    {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
    },
    'api-key',
  )
  .build();
```

## 🔒 Sicherheitsaspekte

### **Vorteile der API-Key Authentifizierung:**
- ✅ **Einfach:** Keine komplexe Token-Verwaltung
- ✅ **Stateless:** Kein Session-Management
- ✅ **Schnell:** Minimaler Overhead
- ✅ **Swagger-kompatibel:** Einfache Dokumentation

### **Sicherheitsempfehlungen:**
- 🔐 **Starker API-Key:** Mindestens 32 Zeichen
- 🔄 **Rotation:** Regelmäßiger Wechsel
- 📝 **Logging:** API-Key Verwendung protokollieren
- 🌐 **HTTPS:** Nur über verschlüsselte Verbindungen

### **Beispiel für sicheren API-Key:**
```bash
STATIC_API_KEY=labcheck_2024_a8f3k9m2n7q1w5e8r4t6y9u3i0p2s5d7
```

## 🎯 Verwendung in verschiedenen Umgebungen

### **Development:**
```bash
STATIC_API_KEY=dev-api-key-123
```

### **Production:**
```bash
STATIC_API_KEY=prod-secure-key-xyz789abc
```

### **Testing:**
```bash
STATIC_API_KEY=test-api-key-456
```

## 🚀 Nächste Schritte

1. **Umgebungsvariablen konfigurieren**
2. **Authentifizierung reaktivieren**
3. **API-Key an Frontend-Team weitergeben**
4. **Swagger-Tests durchführen**
5. **Produktions-Keys generieren**

Die API-Key Authentifizierung ist bereit für die Aktivierung, sobald die Umgebungsvariablen konfiguriert sind! 🔑
