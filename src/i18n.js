// Languages. The game's text (menus in index.html, messages in code) is the
// key; each entry lists it in every language in LANGS order. Road signs,
// place names and car names stay as they are (they are part of the scenery).
// "auto" picks the phone's / browser's language (navigator.languages), and
// falls back to English.
export const LANGS = ['en', 'de', 'fr', 'es', 'it', 'pl', 'tr', 'nl', 'pt'];
export const LANG_NAMES = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', pl: 'Polski', tr: 'Türkçe', nl: 'Nederlands', pt: 'Português' };

// [en, de, fr, es, it, pl, tr, nl, pt]
const D = [
  // ---- main menu ----
  ['Keine Geschwindigkeitsbegrenzung. Meistens.', 'No speed limit. Mostly.', 'Keine Geschwindigkeitsbegrenzung. Meistens.', 'Pas de limitation de vitesse. En général.', 'Sin límite de velocidad. Casi siempre.', 'Sin limiti di velocità. Quasi sempre.', 'Bez ograniczenia prędkości. Prawie zawsze.', 'Hız sınırı yok. Çoğunlukla.', 'Geen snelheidslimiet. Meestal.', 'Sem limite de velocidade. Quase sempre.'],
  ['PLAY', 'PLAY', 'FAHREN', 'JOUER', 'JUGAR', 'GIOCA', 'GRAJ', 'OYNA', 'SPELEN', 'JOGAR'],
  ['Freie Fahrt', 'Open road', 'Freie Fahrt', 'Route libre', 'Vía libre', 'Strada libera', 'Wolna droga', 'Açık yol', 'Vrije baan', 'Estrada livre'],
  ['GARAGE', 'GARAGE', 'GARAGE', 'GARAGE', 'GARAJE', 'GARAGE', 'GARAŻ', 'GARAJ', 'GARAGE', 'GARAGEM'],
  ['MUSIC', 'MUSIC', 'MUSIK', 'MUSIQUE', 'MÚSICA', 'MUSICA', 'MUZYKA', 'MÜZİK', 'MUZIEK', 'MÚSICA'],
  ['SETTINGS', 'SETTINGS', 'EINSTELLUNGEN', 'RÉGLAGES', 'AJUSTES', 'IMPOSTAZIONI', 'USTAWIENIA', 'AYARLAR', 'INSTELLINGEN', 'DEFINIÇÕES'],
  ['Audio · graphics · world', 'Audio · graphics · world', 'Audio · Grafik · Welt', 'Audio · graphismes · monde', 'Audio · gráficos · mundo', 'Audio · grafica · mondo', 'Dźwięk · grafika · świat', 'Ses · grafik · dünya', 'Audio · graphics · wereld', 'Áudio · gráficos · mundo'],
  ['drive', 'drive', 'fahren', 'conduire', 'conducir', 'guida', 'jazda', 'sür', 'rijden', 'conduzir'],
  ['horn', 'horn', 'Hupe', 'klaxon', 'claxon', 'clacson', 'klakson', 'korna', 'claxon', 'buzina'],
  ['camera / cockpit', 'camera / cockpit', 'Kamera / Cockpit', 'caméra / cockpit', 'cámara / cabina', 'camera / abitacolo', 'kamera / kokpit', 'kamera / kokpit', 'camera / cockpit', 'câmara / cockpit'],
  ['recover', 'recover', 'zurück auf die Spur', 'replacer', 'recolocar', 'riposiziona', 'powrót na drogę', 'yola dön', 'herstellen', 'repor'],
  ['radio', 'radio', 'Radio', 'radio', 'radio', 'radio', 'radio', 'radyo', 'radio', 'rádio'],
  ['pause', 'pause', 'Pause', 'pause', 'pausa', 'pausa', 'pauza', 'duraklat', 'pauze', 'pausa'],
  ['DAILY MISSIONS', 'DAILY MISSIONS', 'TAGESAUFGABEN', 'MISSIONS DU JOUR', 'MISIONES DIARIAS', 'MISSIONI DEL GIORNO', 'MISJE DNIA', 'GÜNLÜK GÖREVLER', 'DAGELIJKSE MISSIES', 'MISSÕES DIÁRIAS'],
  ['LEADERBOARDS', 'LEADERBOARDS', 'BESTENLISTEN', 'CLASSEMENTS', 'CLASIFICACIONES', 'CLASSIFICHE', 'RANKINGI', 'SIRALAMALAR', 'RANGLIJSTEN', 'CLASSIFICAÇÕES'],
  ['ACHIEVEMENTS', 'ACHIEVEMENTS', 'ERFOLGE', 'SUCCÈS', 'LOGROS', 'OBIETTIVI', 'OSIĄGNIĘCIA', 'BAŞARIMLAR', 'PRESTATIES', 'CONQUISTAS'],
  ['REMOVE ADS', 'REMOVE ADS', 'WERBUNG ENTFERNEN', 'SUPPRIMER LES PUBS', 'QUITAR ANUNCIOS', 'RIMUOVI PUBBLICITÀ', 'USUŃ REKLAMY', 'REKLAMLARI KALDIR', 'ADVERTENTIES VERWIJDEREN', 'REMOVER ANÚNCIOS'],
  ['Restore purchases', 'Restore purchases', 'Käufe wiederherstellen', 'Restaurer les achats', 'Restaurar compras', 'Ripristina acquisti', 'Przywróć zakupy', 'Satın alımları geri yükle', 'Aankopen herstellen', 'Restaurar compras'],
  ['Ads removed. Thank you!', 'Ads removed. Thank you!', 'Werbung entfernt. Danke!', 'Pubs supprimées. Merci !', 'Anuncios eliminados. ¡Gracias!', 'Pubblicità rimossa. Grazie!', 'Reklamy usunięte. Dziękujemy!', 'Reklamlar kaldırıldı. Teşekkürler!', 'Advertenties verwijderd. Bedankt!', 'Anúncios removidos. Obrigado!'],
  ['BEST {0} PTS', 'BEST {0} PTS', 'BESTWERT {0} PKT', 'RECORD {0} PTS', 'RÉCORD {0} PTS', 'RECORD {0} PT', 'REKORD {0} PKT', 'REKOR {0} PUAN', 'RECORD {0} PNT', 'RECORDE {0} PTS'],
  // ---- garage ----
  ['Top speed', 'Top speed', 'Höchstgeschwindigkeit', 'Vitesse max.', 'Velocidad máx.', 'Velocità max', 'Prędkość maks.', 'Azami hız', 'Topsnelheid', 'Velocidade máx.'],
  ['Acceleration', 'Acceleration', 'Beschleunigung', 'Accélération', 'Aceleración', 'Accelerazione', 'Przyspieszenie', 'Hızlanma', 'Acceleratie', 'Aceleração'],
  ['Handling', 'Handling', 'Fahrverhalten', 'Tenue de route', 'Manejo', 'Maneggevolezza', 'Prowadzenie', 'Yol tutuş', 'Wegligging', 'Condução'],
  ['PAINT', 'PAINT', 'LACK', 'PEINTURE', 'PINTURA', 'VERNICE', 'LAKIER', 'BOYA', 'LAK', 'PINTURA'],
  ['HOLD TO REV', 'HOLD TO REV', 'HALTEN ZUM GASGEBEN', 'MAINTENIR POUR ACCÉLÉRER', 'MANTÉN PARA ACELERAR', 'TIENI PREMUTO', 'PRZYTRZYMAJ, BY DODAĆ GAZU', 'GAZ İÇİN BASILI TUT', 'INGEDRUKT HOUDEN', 'MANTÉM PARA ACELERAR'],
  ['BACK', 'BACK', 'ZURÜCK', 'RETOUR', 'ATRÁS', 'INDIETRO', 'WSTECZ', 'GERİ', 'TERUG', 'VOLTAR'],
  ['DRIVE', 'DRIVE', 'LOSFAHREN', 'ROULER', 'CONDUCIR', 'GUIDA', 'JEDŹ', 'SÜR', 'RIJDEN', 'CONDUZIR'],
  ['drag to rotate', 'drag to rotate', 'ziehen zum Drehen', 'glisser pour tourner', 'arrastra para girar', 'trascina per ruotare', 'przeciągnij, aby obrócić', 'döndürmek için sürükle', 'sleep om te draaien', 'arrasta para rodar'],
  ['BUY · {0}', 'BUY · {0}', 'KAUFEN · {0}', 'ACHETER · {0}', 'COMPRAR · {0}', 'COMPRA · {0}', 'KUP · {0}', 'SATIN AL · {0}', 'KOPEN · {0}', 'COMPRAR · {0}'],
  ['LOCKED · {0}', 'LOCKED · {0}', 'GESPERRT · {0}', 'VERROUILLÉ · {0}', 'BLOQUEADO · {0}', 'BLOCCATO · {0}', 'ZABLOKOWANE · {0}', 'KİLİTLİ · {0}', 'VERGRENDELD · {0}', 'BLOQUEADO · {0}'],
  ['Unlocked!', 'Unlocked!', 'Freigeschaltet!', 'Débloqué !', '¡Desbloqueado!', 'Sbloccato!', 'Odblokowano!', 'Kilit açıldı!', 'Ontgrendeld!', 'Desbloqueado!'],
  ['New paint', 'New paint', 'Neuer Lack', 'Nouvelle peinture', 'Nueva pintura', 'Nuova vernice', 'Nowy lakier', 'Yeni boya', 'Nieuwe lak', 'Nova pintura'],
  ['Not enough money', 'Not enough money', 'Nicht genug Geld', 'Pas assez d’argent', 'No tienes suficiente dinero', 'Soldi insufficienti', 'Za mało pieniędzy', 'Yeterli para yok', 'Niet genoeg geld', 'Dinheiro insuficiente'],
  // ---- music ----
  ['TRACKS', 'TRACKS', 'TITEL', 'MORCEAUX', 'PISTAS', 'BRANI', 'UTWORY', 'PARÇALAR', 'NUMMERS', 'FAIXAS'],
  ['RESTORE', 'RESTORE', 'WIEDERHERSTELLEN', 'RESTAURER', 'RESTAURAR', 'RIPRISTINA', 'PRZYWRÓĆ', 'GERİ YÜKLE', 'HERSTELLEN', 'RESTAURAR'],
  ['ADD AUDIO FILES', 'ADD AUDIO FILES', 'AUDIODATEIEN HINZUFÜGEN', 'AJOUTER DES FICHIERS AUDIO', 'AÑADIR ARCHIVOS DE AUDIO', 'AGGIUNGI FILE AUDIO', 'DODAJ PLIKI AUDIO', 'SES DOSYASI EKLE', 'AUDIOBESTANDEN TOEVOEGEN', 'ADICIONAR FICHEIROS DE ÁUDIO'],
  // ---- settings ----
  ['Audio', 'Audio', 'Audio', 'Audio', 'Audio', 'Audio', 'Dźwięk', 'Ses', 'Audio', 'Áudio'],
  ['Master', 'Master', 'Gesamt', 'Général', 'General', 'Generale', 'Główna', 'Genel', 'Totaal', 'Geral'],
  ['Music', 'Music', 'Musik', 'Musique', 'Música', 'Musica', 'Muzyka', 'Müzik', 'Muziek', 'Música'],
  ['Engine', 'Engine', 'Motor', 'Moteur', 'Motor', 'Motore', 'Silnik', 'Motor', 'Motor', 'Motor'],
  ['Effects', 'Effects', 'Effekte', 'Effets', 'Efectos', 'Effetti', 'Efekty', 'Efektler', 'Effecten', 'Efeitos'],
  ['World', 'World', 'Welt', 'Monde', 'Mundo', 'Mondo', 'Świat', 'Dünya', 'Wereld', 'Mundo'],
  ['Time of day', 'Time of day', 'Tageszeit', 'Heure', 'Hora del día', 'Ora del giorno', 'Pora dnia', 'Günün saati', 'Tijdstip', 'Hora do dia'],
  ['Day / night cycle', 'Day / night cycle', 'Tag / Nacht', 'Cycle jour / nuit', 'Ciclo día / noche', 'Ciclo giorno / notte', 'Cykl dnia i nocy', 'Gece / gündüz döngüsü', 'Dag / nacht', 'Ciclo dia / noite'],
  ['Sunrise', 'Sunrise', 'Sonnenaufgang', 'Lever du soleil', 'Amanecer', 'Alba', 'Wschód słońca', 'Gün doğumu', 'Zonsopgang', 'Nascer do sol'],
  ['Midday', 'Midday', 'Mittag', 'Midi', 'Mediodía', 'Mezzogiorno', 'Południe', 'Öğle', 'Middag', 'Meio-dia'],
  ['Sunset', 'Sunset', 'Sonnenuntergang', 'Coucher du soleil', 'Atardecer', 'Tramonto', 'Zachód słońca', 'Gün batımı', 'Zonsondergang', 'Pôr do sol'],
  ['Night', 'Night', 'Nacht', 'Nuit', 'Noche', 'Notte', 'Noc', 'Gece', 'Nacht', 'Noite'],
  ['Weather', 'Weather', 'Wetter', 'Météo', 'Tiempo', 'Meteo', 'Pogoda', 'Hava', 'Weer', 'Tempo'],
  ['Dynamic', 'Dynamic', 'Wechselnd', 'Dynamique', 'Dinámico', 'Dinamico', 'Zmienna', 'Değişken', 'Wisselend', 'Dinâmico'],
  ['Clear', 'Clear', 'Klar', 'Dégagé', 'Despejado', 'Sereno', 'Bezchmurnie', 'Açık', 'Helder', 'Limpo'],
  ['Cloudy', 'Cloudy', 'Bewölkt', 'Nuageux', 'Nublado', 'Nuvoloso', 'Pochmurno', 'Bulutlu', 'Bewolkt', 'Nublado'],
  ['Overcast', 'Overcast', 'Bedeckt', 'Couvert', 'Cubierto', 'Coperto', 'Zachmurzenie', 'Kapalı', 'Zwaar bewolkt', 'Encoberto'],
  ['Rain', 'Rain', 'Regen', 'Pluie', 'Lluvia', 'Pioggia', 'Deszcz', 'Yağmur', 'Regen', 'Chuva'],
  ['Thunderstorm', 'Thunderstorm', 'Gewitter', 'Orage', 'Tormenta', 'Temporale', 'Burza', 'Fırtına', 'Onweer', 'Trovoada'],
  ['Nebel (fog)', 'Fog', 'Nebel', 'Brouillard', 'Niebla', 'Nebbia', 'Mgła', 'Sis', 'Mist', 'Nevoeiro'],
  ['Fog', 'Fog', 'Nebel', 'Brouillard', 'Niebla', 'Nebbia', 'Mgła', 'Sis', 'Mist', 'Nevoeiro'],
  ['Snow', 'Snow', 'Schnee', 'Neige', 'Nieve', 'Neve', 'Śnieg', 'Kar', 'Sneeuw', 'Neve'],
  ['Traffic', 'Traffic', 'Verkehr', 'Trafic', 'Tráfico', 'Traffico', 'Ruch', 'Trafik', 'Verkeer', 'Trânsito'],
  ['Light', 'Light', 'Wenig', 'Léger', 'Ligero', 'Scarso', 'Mały', 'Az', 'Rustig', 'Pouco'],
  ['Normal', 'Normal', 'Normal', 'Normal', 'Normal', 'Normale', 'Normalny', 'Normal', 'Normaal', 'Normal'],
  ['Rush hour', 'Rush hour', 'Berufsverkehr', 'Heure de pointe', 'Hora punta', 'Ora di punta', 'Godziny szczytu', 'Yoğun saat', 'Spits', 'Hora de ponta'],
  ['Display', 'Display', 'Anzeige', 'Affichage', 'Pantalla', 'Schermo', 'Wyświetlanie', 'Ekran', 'Weergave', 'Ecrã'],
  ['Graphics', 'Graphics', 'Grafik', 'Graphismes', 'Gráficos', 'Grafica', 'Grafika', 'Grafik', 'Graphics', 'Gráficos'],
  ['Auto', 'Auto', 'Automatisch', 'Auto', 'Automático', 'Automatica', 'Automatycznie', 'Otomatik', 'Automatisch', 'Automático'],
  ['Battery saver', 'Battery saver', 'Akku sparen', 'Économie de batterie', 'Ahorro de batería', 'Risparmio batteria', 'Oszczędzanie baterii', 'Pil tasarrufu', 'Batterijbesparing', 'Poupança de bateria'],
  ['Low', 'Low', 'Niedrig', 'Basse', 'Baja', 'Bassa', 'Niska', 'Düşük', 'Laag', 'Baixa'],
  ['Medium', 'Medium', 'Mittel', 'Moyenne', 'Media', 'Media', 'Średnia', 'Orta', 'Gemiddeld', 'Média'],
  ['High', 'High', 'Hoch', 'Haute', 'Alta', 'Alta', 'Wysoka', 'Yüksek', 'Hoog', 'Alta'],
  ['Speed unit', 'Speed unit', 'Tempo-Einheit', 'Unité de vitesse', 'Unidad de velocidad', 'Unità di velocità', 'Jednostka prędkości', 'Hız birimi', 'Snelheidseenheid', 'Unidade de velocidade'],
  ['Camera shake', 'Camera shake', 'Kamerawackeln', 'Tremblement caméra', 'Vibración de cámara', 'Tremolio camera', 'Drgania kamery', 'Kamera sarsıntısı', 'Camera schudden', 'Tremor da câmara'],
  ['On', 'On', 'An', 'Activé', 'Sí', 'Sì', 'Wł.', 'Açık', 'Aan', 'Ligado'],
  ['Off', 'Off', 'Aus', 'Désactivé', 'No', 'No', 'Wył.', 'Kapalı', 'Uit', 'Desligado'],
  ['Controls', 'Controls', 'Steuerung', 'Commandes', 'Controles', 'Comandi', 'Sterowanie', 'Kontroller', 'Besturing', 'Controlos'],
  ['Steering', 'Steering', 'Lenkung', 'Direction', 'Dirección', 'Sterzo', 'Kierowanie', 'Direksiyon', 'Sturen', 'Direção'],
  ['Touch buttons', 'Touch buttons', 'Touch-Tasten', 'Boutons tactiles', 'Botones táctiles', 'Pulsanti touch', 'Przyciski dotykowe', 'Dokunmatik tuşlar', 'Aanraakknoppen', 'Botões táteis'],
  ['Tilt the phone', 'Tilt the phone', 'Handy neigen', 'Incliner le téléphone', 'Inclinar el móvil', 'Inclina il telefono', 'Przechylanie telefonu', 'Telefonu eğ', 'Telefoon kantelen', 'Inclinar o telemóvel'],
  ['Gas', 'Gas', 'Gas', 'Accélérateur', 'Acelerador', 'Acceleratore', 'Gaz', 'Gaz', 'Gas', 'Acelerador'],
  ['Automatic (brake to slow)', 'Automatic (brake to slow)', 'Automatisch (bremsen zum Verlangsamen)', 'Automatique (freiner pour ralentir)', 'Automático (frena para reducir)', 'Automatico (frena per rallentare)', 'Automatyczny (hamuj, by zwolnić)', 'Otomatik (yavaşlamak için fren)', 'Automatisch (rem om af te remmen)', 'Automático (trava para abrandar)'],
  ['Gas pedal', 'Gas pedal', 'Gaspedal', 'Pédale d’accélérateur', 'Pedal de acelerador', 'Pedale acceleratore', 'Pedał gazu', 'Gaz pedalı', 'Gaspedaal', 'Pedal do acelerador'],
  ['Vibration', 'Vibration', 'Vibration', 'Vibration', 'Vibración', 'Vibrazione', 'Wibracje', 'Titreşim', 'Trillen', 'Vibração'],
  ['Language', 'Language', 'Sprache', 'Langue', 'Idioma', 'Lingua', 'Język', 'Dil', 'Taal', 'Idioma'],
  ['Automatic (phone language)', 'Automatic (phone language)', 'Automatisch (Sprache des Handys)', 'Automatique (langue du téléphone)', 'Automático (idioma del móvil)', 'Automatica (lingua del telefono)', 'Automatycznie (język telefonu)', 'Otomatik (telefon dili)', 'Automatisch (taal van de telefoon)', 'Automático (idioma do telemóvel)'],
  ['More', 'More', 'Mehr', 'Plus', 'Más', 'Altro', 'Więcej', 'Diğer', 'Meer', 'Mais'],
  ['DATENSCHUTZ & WERBUNG', 'PRIVACY & ADS', 'DATENSCHUTZ & WERBUNG', 'CONFIDENTIALITÉ & PUBS', 'PRIVACIDAD Y ANUNCIOS', 'PRIVACY E PUBBLICITÀ', 'PRYWATNOŚĆ I REKLAMY', 'GİZLİLİK VE REKLAMLAR', 'PRIVACY & ADVERTENTIES', 'PRIVACIDADE E ANÚNCIOS'],
  ['PRIVACY POLICY', 'PRIVACY POLICY', 'DATENSCHUTZERKLÄRUNG', 'POLITIQUE DE CONFIDENTIALITÉ', 'POLÍTICA DE PRIVACIDAD', 'INFORMATIVA PRIVACY', 'POLITYKA PRYWATNOŚCI', 'GİZLİLİK POLİTİKASI', 'PRIVACYBELEID', 'POLÍTICA DE PRIVACIDADE'],
  ['SEND ERROR REPORT', 'SEND ERROR REPORT', 'FEHLERBERICHT SENDEN', 'ENVOYER UN RAPPORT D’ERREUR', 'ENVIAR INFORME DE ERRORES', 'INVIA SEGNALAZIONE ERRORI', 'WYŚLIJ RAPORT BŁĘDÓW', 'HATA RAPORU GÖNDER', 'FOUTRAPPORT VERSTUREN', 'ENVIAR RELATÓRIO DE ERROS'],
  ['SHOW TUTORIAL', 'SHOW TUTORIAL', 'ANLEITUNG ZEIGEN', 'AFFICHER LE TUTORIEL', 'VER TUTORIAL', 'MOSTRA TUTORIAL', 'POKAŻ SAMOUCZEK', 'EĞİTİMİ GÖSTER', 'UITLEG TONEN', 'VER TUTORIAL'],
  ['Report copied – paste it into an e-mail or GitHub issue', 'Report copied – paste it into an e-mail or GitHub issue', 'Bericht kopiert – in eine E-Mail oder ein GitHub-Issue einfügen', 'Rapport copié – collez-le dans un e-mail', 'Informe copiado: pégalo en un correo', 'Rapporto copiato: incollalo in un’e-mail', 'Raport skopiowany – wklej go do e-maila', 'Rapor kopyalandı – e-postaya yapıştırın', 'Rapport gekopieerd – plak het in een e-mail', 'Relatório copiado – cola-o num e-mail'],
  ['DONE', 'DONE', 'FERTIG', 'TERMINÉ', 'LISTO', 'FATTO', 'GOTOWE', 'TAMAM', 'KLAAR', 'CONCLUÍDO'],
  // ---- pause / game over ----
  ['PAUSED', 'PAUSED', 'PAUSE', 'PAUSE', 'PAUSA', 'PAUSA', 'PAUZA', 'DURAKLATILDI', 'GEPAUZEERD', 'EM PAUSA'],
  ['RESUME', 'RESUME', 'WEITER', 'REPRENDRE', 'CONTINUAR', 'RIPRENDI', 'WZNÓW', 'DEVAM', 'HERVATTEN', 'RETOMAR'],
  ['RESTART', 'RESTART', 'NEUSTART', 'RECOMMENCER', 'REINICIAR', 'RICOMINCIA', 'OD NOWA', 'YENİDEN BAŞLAT', 'OPNIEUW', 'RECOMEÇAR'],
  ['MAIN MENU', 'MAIN MENU', 'HAUPTMENÜ', 'MENU PRINCIPAL', 'MENÚ PRINCIPAL', 'MENU PRINCIPALE', 'MENU GŁÓWNE', 'ANA MENÜ', 'HOOFDMENU', 'MENU PRINCIPAL'],
  ['AGAIN', 'AGAIN', 'NOCHMAL', 'ENCORE', 'OTRA VEZ', 'ANCORA', 'JESZCZE RAZ', 'TEKRAR', 'NOG EENS', 'DE NOVO'],
  ['near misses', 'near misses', 'Beinahe-Unfälle', 'frôlements', 'roces', 'sorpassi al pelo', 'mijanki o włos', 'kıl payı', 'bijna-botsingen', 'tangentes'],
  ['NEW BEST', 'NEW BEST', 'NEUER BESTWERT', 'NOUVEAU RECORD', 'NUEVO RÉCORD', 'NUOVO RECORD', 'NOWY REKORD', 'YENİ REKOR', 'NIEUW RECORD', 'NOVO RECORDE'],
  ['BEST {0}', 'BEST {0}', 'BESTWERT {0}', 'RECORD {0}', 'RÉCORD {0}', 'RECORD {0}', 'REKORD {0}', 'REKOR {0}', 'RECORD {0}', 'RECORDE {0}'],
  ['WEITERFAHREN', 'KEEP GOING', 'WEITERFAHREN', 'CONTINUER', 'SEGUIR', 'CONTINUA', 'JEDŹ DALEJ', 'DEVAM ET', 'DOORRIJDEN', 'CONTINUAR'],
  ['1 Werbung ansehen', 'watch 1 ad', '1 Werbung ansehen', 'regarder 1 pub', 'ver 1 anuncio', 'guarda 1 annuncio', 'obejrzyj 1 reklamę', '1 reklam izle', 'bekijk 1 advertentie', 'ver 1 anúncio'],
  ['DOUBLE MONEY', 'DOUBLE MONEY', 'GELD VERDOPPELN', 'DOUBLER L’ARGENT', 'DOBLAR EL DINERO', 'RADDOPPIA I SOLDI', 'PODWÓJ PIENIĄDZE', 'PARAYI İKİYE KATLA', 'GELD VERDUBBELEN', 'DUPLICAR DINHEIRO'],
  ['earned', 'earned', 'verdient', 'gagnés', 'ganados', 'guadagnati', 'zarobione', 'kazanıldı', 'verdiend', 'ganhos'],
  ['Waive the fine', 'Waive the fine', 'Bußgeld erlassen', 'Annuler l’amende', 'Anular la multa', 'Annulla la multa', 'Anuluj mandat', 'Cezayı sil', 'Boete kwijtschelden', 'Anular a multa'],
  // ---- HUD ----
  ['PTS', 'PTS', 'PKT', 'PTS', 'PTS', 'PT', 'PKT', 'PUAN', 'PNT', 'PTS'],
  ['CHASSIS', 'CHASSIS', 'KAROSSERIE', 'CARROSSERIE', 'CHASIS', 'TELAIO', 'KAROSERIA', 'KAPORTA', 'CARROSSERIE', 'CHASSIS'],
  ['SLIDE', 'SLIDE', 'RUTSCHT', 'DÉRAPAGE', 'DERRAPE', 'SBANDATA', 'POŚLIZG', 'KAYMA', 'SLIP', 'DERRAPAGEM'],
  ['GLATT!', 'SLIPPERY!', 'GLATT!', 'GLISSANT !', '¡RESBALA!', 'SCIVOLOSO!', 'ŚLISKO!', 'KAYGAN!', 'GLAD!', 'ESCORREGADIO!'],
  ['ÖL!', 'OIL!', 'ÖL!', 'HUILE !', '¡ACEITE!', 'OLIO!', 'OLEJ!', 'YAĞ!', 'OLIE!', 'ÓLEO!'],
  ['RADIO OFF', 'RADIO OFF', 'RADIO AUS', 'RADIO ÉTEINTE', 'RADIO APAGADA', 'RADIO SPENTA', 'RADIO WYŁ.', 'RADYO KAPALI', 'RADIO UIT', 'RÁDIO DESLIGADO'],
  // ---- messages ----
  ['FREIE FAHRT', 'OPEN ROAD', 'FREIE FAHRT', 'ROUTE LIBRE', 'VÍA LIBRE', 'STRADA LIBERA', 'WOLNA DROGA', 'AÇIK YOL', 'VRIJE BAAN', 'ESTRADA LIVRE'],
  ["No limit. Don't hit anything.", "No limit. Don't hit anything.", 'Kein Limit. Nirgends anfahren.', 'Pas de limite. Ne touchez rien.', 'Sin límite. No choques con nada.', 'Nessun limite. Non toccare nulla.', 'Bez limitu. Niczego nie uderz.', 'Sınır yok. Hiçbir şeye çarpma.', 'Geen limiet. Raak niets.', 'Sem limite. Não batas em nada.'],
  ['End of all restrictions', 'End of all restrictions', 'Ende aller Streckenverbote', 'Fin de toutes les restrictions', 'Fin de todas las restricciones', 'Fine di tutti i divieti', 'Koniec ograniczeń', 'Tüm kısıtlamaların sonu', 'Einde van alle beperkingen', 'Fim de todas as restrições'],
  ['TEMPOLIMIT {0}', 'SPEED LIMIT {0}', 'TEMPOLIMIT {0}', 'LIMITE {0}', 'LÍMITE {0}', 'LIMITE {0}', 'OGRANICZENIE {0}', 'HIZ SINIRI {0}', 'MAXIMUM {0}', 'LIMITE {0}'],
  ['Blitzer ahead? Maybe.', 'Speed camera ahead? Maybe.', 'Blitzer voraus? Vielleicht.', 'Radar devant ? Peut-être.', '¿Radar delante? Quizá.', 'Autovelox più avanti? Forse.', 'Fotoradar przed tobą? Może.', 'İleride radar? Belki.', 'Flitser verderop? Misschien.', 'Radar à frente? Talvez.'],
  ['GEBLITZT!', 'SPEED CAMERA!', 'GEBLITZT!', 'FLASHÉ !', '¡MULTADO!', 'MULTATO!', 'FOTORADAR!', 'RADARA YAKALANDIN!', 'GEFLITST!', 'APANHADO NO RADAR!'],
  ['{0} in a {1} zone · −{2}', '{0} in a {1} zone · −{2}', '{0} in einer {1}er-Zone · −{2}', '{0} en zone {1} · −{2}', '{0} en zona de {1} · −{2}', '{0} in zona {1} · −{2}', '{0} w strefie {1} · −{2}', '{1} bölgesinde {0} · −{2}', '{0} in een {1}-zone · −{2}', '{0} numa zona de {1} · −{2}'],
  ['RASEREI', 'EXTREME SPEEDING', 'RASEREI', 'GRAND EXCÈS DE VITESSE', 'EXCESO GRAVE', 'ECCESSO GRAVE', 'RAŻĄCE PRZEKROCZENIE', 'AŞIRI HIZ', 'EXTREEM TE HARD', 'EXCESSO GRAVE'],
  ['{0} km/h zu schnell · Polizei alarmiert', '{0} km/h too fast · police alerted', '{0} km/h zu schnell · Polizei alarmiert', '{0} km/h de trop · police alertée', '{0} km/h de más · policía avisada', '{0} km/h oltre · polizia allertata', '{0} km/h za szybko · policja powiadomiona', '{0} km/s fazla · polis haberdar', '{0} km/u te snel · politie gealarmeerd', '{0} km/h a mais · polícia alertada'],
  ['UNFALLFLUCHT', 'HIT AND RUN', 'UNFALLFLUCHT', 'DÉLIT DE FUITE', 'FUGA TRAS ACCIDENTE', 'OMISSIONE DI SOCCORSO', 'UCIECZKA Z MIEJSCA', 'KAZA YAPIP KAÇMA', 'DOORRIJDEN NA ONGEVAL', 'FUGA AO ACIDENTE'],
  ['Polizei alarmiert', 'Police alerted', 'Polizei alarmiert', 'Police alertée', 'Policía avisada', 'Polizia allertata', 'Policja powiadomiona', 'Polis haberdar', 'Politie gealarmeerd', 'Polícia alertada'],
  ['FESTGENOMMEN', 'ARRESTED', 'FESTGENOMMEN', 'ARRÊTÉ', 'DETENIDO', 'ARRESTATO', 'ZATRZYMANY', 'TUTUKLANDIN', 'GEARRESTEERD', 'DETIDO'],
  ['Aussteigen, Hände aufs Dach.', 'Step out, hands on the roof.', 'Aussteigen, Hände aufs Dach.', 'Sortez, les mains sur le toit.', 'Salga, manos sobre el techo.', 'Scenda, mani sul tetto.', 'Wysiadać, ręce na dach.', 'Araçtan in, eller tavana.', 'Uitstappen, handen op het dak.', 'Saia, mãos no tejadilho.'],
  ['ENTKOMMEN!', 'ESCAPED!', 'ENTKOMMEN!', 'ÉCHAPPÉ !', '¡ESCAPASTE!', 'SEMINATI!', 'UCIECZKA UDANA!', 'KAÇTIN!', 'ONTSNAPT!', 'ESCAPASTE!'],
  ['Polizei abgehängt · +2500', 'Police shaken off · +2500', 'Polizei abgehängt · +2500', 'Police semée · +2500', 'Policía despistada · +2500', 'Polizia seminata · +2500', 'Policja zgubiona · +2500', 'Polis atlatıldı · +2500', 'Politie afgeschud · +2500', 'Polícia despistada · +2500'],
  ['POLIZEI GIBT AUF', 'POLICE GIVE UP', 'POLIZEI GIBT AUF', 'LA POLICE ABANDONNE', 'LA POLICÍA SE RINDE', 'LA POLIZIA RINUNCIA', 'POLICJA SIĘ PODDAJE', 'POLİS VAZGEÇTİ', 'POLITIE GEEFT OP', 'A POLÍCIA DESISTE'],
  ['VERKEHRSKONTROLLE', 'TRAFFIC STOP', 'VERKEHRSKONTROLLE', 'CONTRÔLE ROUTIER', 'CONTROL DE TRÁFICO', 'CONTROLLO STRADALE', 'KONTROLA DROGOWA', 'TRAFİK KONTROLÜ', 'VERKEERSCONTROLE', 'OPERAÇÃO STOP'],
  ['Bußgeld −{0} · Gute Fahrt!', 'Fine −{0} · drive safely!', 'Bußgeld −{0} · Gute Fahrt!', 'Amende −{0} · bonne route !', 'Multa −{0} · ¡buen viaje!', 'Multa −{0} · buon viaggio!', 'Mandat −{0} · szerokiej drogi!', 'Ceza −{0} · iyi yolculuklar!', 'Boete −{0} · goede reis!', 'Multa −{0} · boa viagem!'],
  ['TOTALSCHADEN', 'WRECKED', 'TOTALSCHADEN', 'ÉPAVE', 'SINIESTRO TOTAL', 'DISTRUTTA', 'SZKODA CAŁKOWITA', 'HURDA', 'TOTAL LOSS', 'PERDA TOTAL'],
  ['ÜBERSCHLAG!', 'ROLLOVER!', 'ÜBERSCHLAG!', 'TONNEAU !', '¡VUELCO!', 'CAPPOTTAMENTO!', 'DACHOWANIE!', 'TAKLA!', 'OVER DE KOP!', 'CAPOTAMENTO!'],
  ['ÜBERSCHLAG', 'ROLLOVER', 'ÜBERSCHLAG', 'TONNEAU', 'VUELCO', 'CAPPOTTAMENTO', 'DACHOWANIE', 'TAKLA', 'OVER DE KOP', 'CAPOTAMENTO'],
  ['GLÜCK GEHABT', 'LUCKY', 'GLÜCK GEHABT', 'OUF !', 'QUÉ SUERTE', 'CHE FORTUNA', 'FARCIARZ', 'ŞANSLISIN', 'GELUK GEHAD', 'QUE SORTE'],
  ['Back on four wheels', 'Back on four wheels', 'Wieder auf vier Rädern', 'De nouveau sur quatre roues', 'De nuevo sobre cuatro ruedas', 'Di nuovo su quattro ruote', 'Znowu na czterech kołach', 'Yeniden dört teker üstünde', 'Weer op vier wielen', 'De novo nas quatro rodas'],
  ['ZURÜCK AUF DER SPUR', 'BACK ON TRACK', 'ZURÜCK AUF DER SPUR', 'RETOUR SUR LA ROUTE', 'DE VUELTA EN EL CARRIL', 'DI NUOVO IN CORSIA', 'Z POWROTEM NA PASIE', 'YOLA GERİ DÖNDÜN', 'TERUG OP DE BAAN', 'DE VOLTA À FAIXA'],
  ["WEITER GEHT'S", "LET'S GO ON", "WEITER GEHT'S", 'ÇA REPART', 'SEGUIMOS', 'SI RIPARTE', 'JEDZIEMY DALEJ', 'DEVAM', 'WE GAAN DOOR', 'VAMOS CONTINUAR'],
  ['Wagen repariert · Polizei abgeschüttelt', 'Car repaired · police shaken off', 'Wagen repariert · Polizei abgeschüttelt', 'Voiture réparée · police semée', 'Coche reparado · policía despistada', 'Auto riparata · polizia seminata', 'Auto naprawione · policja zgubiona', 'Araba onarıldı · polis atlatıldı', 'Auto gerepareerd · politie afgeschud', 'Carro reparado · polícia despistada'],
  ['KEINE WERBUNG VERFÜGBAR', 'NO AD AVAILABLE', 'KEINE WERBUNG VERFÜGBAR', 'AUCUNE PUB DISPONIBLE', 'NO HAY ANUNCIOS', 'NESSUN ANNUNCIO', 'BRAK REKLAMY', 'REKLAM YOK', 'GEEN ADVERTENTIE', 'SEM ANÚNCIO'],
  ['Try again in a moment', 'Try again in a moment', 'Gleich nochmal versuchen', 'Réessayez dans un instant', 'Inténtalo de nuevo en un momento', 'Riprova tra poco', 'Spróbuj za chwilę', 'Birazdan tekrar dene', 'Probeer het zo opnieuw', 'Tenta novamente daqui a pouco'],
  ['NEAR MISS ×{0}', 'NEAR MISS ×{0}', 'KNAPP VORBEI ×{0}', 'FRÔLEMENT ×{0}', 'ROCE ×{0}', 'AL PELO ×{0}', 'O WŁOS ×{0}', 'KIL PAYI ×{0}', 'RAKELINGS ×{0}', 'TANGENTE ×{0}'],
  ['{0} KM/H CLUB', '{0} KM/H CLUB', '{0}-KM/H-CLUB', 'CLUB DES {0} KM/H', 'CLUB DE LOS {0} KM/H', 'CLUB DEI {0} KM/H', 'KLUB {0} KM/H', '{0} KM/S KULÜBÜ', '{0} KM/U-CLUB', 'CLUBE DOS {0} KM/H'],
  ['GRAPHICS: {0}', 'GRAPHICS: {0}', 'GRAFIK: {0}', 'GRAPHISMES : {0}', 'GRÁFICOS: {0}', 'GRAFICA: {0}', 'GRAFIKA: {0}', 'GRAFİK: {0}', 'GRAPHICS: {0}', 'GRÁFICOS: {0}'],
  ['for smoother driving', 'for smoother driving', 'für flüssigeres Fahren', 'pour une conduite plus fluide', 'para una conducción más fluida', 'per una guida più fluida', 'dla płynniejszej jazdy', 'daha akıcı sürüş için', 'voor vloeiender rijden', 'para uma condução mais fluida'],
  ['AUTOBAHN', 'AUTOBAHN', 'AUTOBAHN', 'AUTOBAHN', 'AUTOBAHN', 'AUTOBAHN', 'AUTOBAHN', 'OTOBAN', 'AUTOBAHN', 'AUTOBAHN'],
  ['Back on the A 9', 'Back on the A 9', 'Zurück auf der A 9', 'De retour sur l’A 9', 'De vuelta en la A 9', 'Di nuovo sulla A 9', 'Z powrotem na A 9', 'Tekrar A 9’da', 'Terug op de A 9', 'De volta à A 9'],
  ['AUSFAHRT {0}', 'EXIT {0}', 'AUSFAHRT {0}', 'SORTIE {0}', 'SALIDA {0}', 'USCITA {0}', 'ZJAZD {0}', 'ÇIKIŞ {0}', 'AFRIT {0}', 'SAÍDA {0}'],
  ['AUFFAHRT', 'ON-RAMP', 'AUFFAHRT', 'BRETELLE D’ACCÈS', 'INCORPORACIÓN', 'RAMPA D’INGRESSO', 'WJAZD', 'GİRİŞ RAMPASI', 'OPRIT', 'ENTRADA'],
  ['LANDSTRASSE', 'COUNTRY ROAD', 'LANDSTRASSE', 'ROUTE DE CAMPAGNE', 'CARRETERA COMARCAL', 'STRADA PROVINCIALE', 'DROGA KRAJOWA', 'KÖY YOLU', 'PROVINCIALE WEG', 'ESTRADA NACIONAL'],
  ['Limit 100 · mind the curves and tractors', 'Limit 100 · mind the curves and tractors', 'Tempo 100 · Achtung Kurven und Traktoren', 'Limite 100 · attention aux virages et tracteurs', 'Límite 100 · cuidado con curvas y tractores', 'Limite 100 · attenzione a curve e trattori', 'Limit 100 · uwaga na zakręty i traktory', 'Sınır 100 · virajlara ve traktörlere dikkat', 'Limiet 100 · let op bochten en tractoren', 'Limite 100 · cuidado com curvas e tratores'],
  ['KREISSTRASSE', 'DISTRICT ROAD', 'KREISSTRASSE', 'ROUTE DÉPARTEMENTALE', 'CARRETERA LOCAL', 'STRADA COMUNALE', 'DROGA POWIATOWA', 'İLÇE YOLU', 'LOKALE WEG', 'ESTRADA MUNICIPAL'],
  ['Narrow and quiet', 'Narrow and quiet', 'Schmal und ruhig', 'Étroite et calme', 'Estrecha y tranquila', 'Stretta e tranquilla', 'Wąsko i spokojnie', 'Dar ve sakin', 'Smal en rustig', 'Estreita e tranquila'],
  ['FELDWEG', 'FARM TRACK', 'FELDWEG', 'CHEMIN AGRICOLE', 'CAMINO RURAL', 'STRADA STERRATA', 'DROGA POLNA', 'TARLA YOLU', 'LANDWEG', 'CAMINHO RURAL'],
  ['Gravel · Landwirtschaftlicher Verkehr frei', 'Gravel · farm traffic only', 'Schotter · Landwirtschaftlicher Verkehr frei', 'Gravier · réservé aux engins agricoles', 'Grava · solo tráfico agrícola', 'Ghiaia · solo mezzi agricoli', 'Żwir · tylko ruch rolniczy', 'Çakıl · yalnızca tarım araçları', 'Grind · alleen landbouwverkeer', 'Gravilha · só trânsito agrícola'],
  ['WALDWEG', 'FOREST TRACK', 'WALDWEG', 'CHEMIN FORESTIER', 'PISTA FORESTAL', 'SENTIERO NEL BOSCO', 'DROGA LEŚNA', 'ORMAN YOLU', 'BOSPAD', 'CAMINHO FLORESTAL'],
  ['Mud, ruts and puddles', 'Mud, ruts and puddles', 'Matsch, Spurrillen und Pfützen', 'Boue, ornières et flaques', 'Barro, roderas y charcos', 'Fango, solchi e pozzanghere', 'Błoto, koleiny i kałuże', 'Çamur, tekerlek izleri ve su birikintileri', 'Modder, sporen en plassen', 'Lama, sulcos e poças'],
  ['OFFROAD-GELÄNDE', 'OFF-ROAD AREA', 'OFFROAD-GELÄNDE', 'TERRAIN TOUT-TERRAIN', 'ZONA TODOTERRENO', 'AREA FUORISTRADA', 'TEREN OFFROAD', 'ARAZİ ALANI', 'OFFROADTERREIN', 'ZONA TODO-O-TERRENO'],
  ['Rocks, mud, water · go anywhere inside', 'Rocks, mud, water · go anywhere inside', 'Felsen, Schlamm, Wasser · fahr, wohin du willst', 'Rochers, boue, eau · roulez où vous voulez', 'Rocas, barro, agua · ve donde quieras', 'Rocce, fango, acqua · vai dove vuoi', 'Skały, błoto, woda · jedź, gdzie chcesz', 'Kaya, çamur, su · içeride istediğin yere git', 'Rotsen, modder, water · rij waar je wilt', 'Rochas, lama, água · vai onde quiseres'],
  ['Ortschaft · 50 km/h', 'Village · 50 km/h', 'Ortschaft · 50 km/h', 'Village · 50 km/h', 'Pueblo · 50 km/h', 'Paese · 50 km/h', 'Miejscowość · 50 km/h', 'Köy · 50 km/s', 'Dorp · 50 km/u', 'Aldeia · 50 km/h'],
  ['POLIZEI', 'POLICE', 'POLIZEI', 'POLICE', 'POLICÍA', 'POLIZIA', 'POLICJA', 'POLİS', 'POLITIE', 'POLÍCIA'],
  ['Blaulicht hinter dir · Anhaltesignal folgt', 'Blue lights behind you · they will signal you to stop', 'Blaulicht hinter dir · Anhaltesignal folgt', 'Gyrophare derrière vous · signal d’arrêt imminent', 'Luces azules detrás · te harán parar', 'Lampeggianti dietro · ti faranno fermare', 'Niebieskie światła za tobą · zaraz sygnał do zatrzymania', 'Arkanda mavi ışık · dur ihtarı geliyor', 'Zwaailicht achter je · stopteken volgt', 'Luzes azuis atrás · vão mandar-te parar'],
  ['BITTE FOLGEN', 'FOLLOW ME', 'BITTE FOLGEN', 'SUIVEZ-MOI', 'SÍGAME', 'MI SEGUA', 'PROSZĘ JECHAĆ ZA MNĄ', 'BENİ TAKİP EDİN', 'VOLG MIJ', 'SIGA-ME'],
  ['BITTE FOLGEN!', 'FOLLOW ME!', 'BITTE FOLGEN!', 'SUIVEZ-MOI !', '¡SÍGAME!', 'MI SEGUA!', 'PROSZĘ JECHAĆ ZA MNĄ!', 'BENİ TAKİP EDİN!', 'VOLG MIJ!', 'SIGA-ME!'],
  ['Dem Streifenwagen folgen · er führt dich raus', 'Follow the patrol car · it will lead you off the road', 'Dem Streifenwagen folgen · er führt dich raus', 'Suivez la voiture de police · elle vous fait sortir', 'Sigue al coche patrulla · te sacará de la vía', 'Segui la volante · ti porterà fuori strada', 'Jedź za radiowozem · wyprowadzi cię', 'Devriye aracını takip et · seni kenara alacak', 'Volg de politieauto · hij leidt je van de weg', 'Segue o carro patrulha · ele leva-te para fora'],
  ['Dem Streifenwagen folgen und anhalten', 'Follow the patrol car and stop', 'Dem Streifenwagen folgen und anhalten', 'Suivez la voiture de police et arrêtez-vous', 'Sigue al coche patrulla y detente', 'Segui la volante e fermati', 'Jedź za radiowozem i zatrzymaj się', 'Devriye aracını takip et ve dur', 'Volg de politieauto en stop', 'Segue o carro patrulha e para'],
  ['Hinter dem Streifenwagen bleiben und anhalten', 'Stay behind the patrol car and stop', 'Hinter dem Streifenwagen bleiben und anhalten', 'Restez derrière la voiture de police et arrêtez-vous', 'Quédate detrás del coche patrulla y detente', 'Resta dietro la volante e fermati', 'Zostań za radiowozem i zatrzymaj się', 'Devriye aracının arkasında kal ve dur', 'Blijf achter de politieauto en stop', 'Fica atrás do carro patrulha e para'],
  ['ANHALTEN', 'PULL OVER', 'ANHALTEN', 'ARRÊTEZ-VOUS', 'DETÉNGASE', 'ACCOSTI', 'ZATRZYMAJ SIĘ', 'KENARA ÇEK', 'STOPPEN', 'ENCOSTE'],
  ['Rechts auf den Seitenstreifen', 'Onto the hard shoulder on the right', 'Rechts auf den Seitenstreifen', 'Sur la bande d’arrêt d’urgence à droite', 'Al arcén de la derecha', 'Sulla corsia d’emergenza a destra', 'Na pobocze po prawej', 'Sağdaki emniyet şeridine', 'Rechts de vluchtstrook op', 'Para a berma à direita'],
  ['Rechts ranfahren', 'Pull over to the right', 'Rechts ranfahren', 'Rangez-vous à droite', 'Échese a la derecha', 'Accosti a destra', 'Zjedź na prawo', 'Sağa çek', 'Rechts aan de kant', 'Encoste à direita'],
  ['VERFOLGUNG', 'PURSUIT', 'VERFOLGUNG', 'POURSUITE', 'PERSECUCIÓN', 'INSEGUIMENTO', 'POŚCIG', 'KOVALAMACA', 'ACHTERVOLGING', 'PERSEGUIÇÃO'],
  ['Anhaltesignal ignoriert · Verstärkung kommt', 'Stop signal ignored · backup is coming', 'Anhaltesignal ignoriert · Verstärkung kommt', 'Signal ignoré · des renforts arrivent', 'Señal ignorada · llegan refuerzos', 'Alt ignorato · arrivano rinforzi', 'Zignorowano sygnał · nadciągają posiłki', 'Dur ihtarı yok sayıldı · destek geliyor', 'Stopteken genegeerd · versterking komt', 'Sinal ignorado · vêm reforços'],
  ['Streifenwagen gerammt', 'Rammed a patrol car', 'Streifenwagen gerammt', 'Voiture de police percutée', 'Embestiste a la patrulla', 'Hai speronato la volante', 'Staranowano radiowóz', 'Devriye aracına çarptın', 'Politieauto geramd', 'Abalroaste a patrulha'],
  ['Noch ein Verstoß', 'Another offence', 'Noch ein Verstoß', 'Nouvelle infraction', 'Otra infracción', 'Un’altra infrazione', 'Kolejne wykroczenie', 'Bir ihlal daha', 'Nog een overtreding', 'Outra infração'],
  ['Widerstand', 'Resisting the police', 'Widerstand', 'Résistance', 'Resistencia', 'Resistenza', 'Opór', 'Direnme', 'Verzet', 'Resistência'],
  ['Streifenwagen ausgefallen', 'Patrol car out of action', 'Streifenwagen ausgefallen', 'Voiture de police hors service', 'Patrulla fuera de combate', 'Volante fuori uso', 'Radiowóz unieruchomiony', 'Devriye aracı devre dışı', 'Politieauto uitgeschakeld', 'Patrulha fora de serviço'],
  ['Flucht vor der Polizei', 'Fleeing the police', 'Flucht vor der Polizei', 'Fuite devant la police', 'Huida de la policía', 'Fuga dalla polizia', 'Ucieczka przed policją', 'Polisten kaçış', 'Vlucht voor de politie', 'Fuga à polícia'],
  ['Streifenwagen überholt', 'Overtook the patrol car', 'Streifenwagen überholt', 'Voiture de police dépassée', 'Adelantaste a la patrulla', 'Hai sorpassato la volante', 'Wyprzedzono radiowóz', 'Devriye aracını geçtin', 'Politieauto ingehaald', 'Ultrapassaste a patrulha'],
  ['Abgefahren statt zu folgen', 'Turned off instead of following', 'Abgefahren statt zu folgen', 'Parti au lieu de suivre', 'Te desviaste en vez de seguir', 'Hai svoltato invece di seguire', 'Zjechano zamiast jechać za nim', 'Takip etmek yerine saptın', 'Afgeslagen in plaats van gevolgd', 'Desviaste em vez de seguir'],
  ['Davongerast', 'Sped off', 'Davongerast', 'Parti en trombe', 'Saliste disparado', 'Sei scappato via', 'Odjechano z piskiem opon', 'Hızla kaçtın', 'Weggescheurd', 'Fugiste a toda a velocidade'],
  ['GROSSFAHNDUNG', 'MANHUNT', 'GROSSFAHNDUNG', 'TRAQUE', 'BÚSQUEDA MASIVA', 'CACCIA ALL’UOMO', 'OBŁAWA', 'BÜYÜK ARAMA', 'GROOTSCHALIGE KLOPJACHT', 'CAÇA AO HOMEM'],
  ['SEK, Hubschrauber, Nagelsperren · sie rammen', 'SWAT, helicopter, spike strips · they ram', 'SEK, Hubschrauber, Nagelsperren · sie rammen', 'GIGN, hélicoptère, herses · ils percutent', 'Antidisturbios, helicóptero, pinchos · embisten', 'Teste di cuoio, elicottero, chiodi · speronano', 'Antyterroryści, helikopter, kolczatki · taranują', 'Özel tim, helikopter, çivili şerit · çarpıyorlar', 'Arrestatieteam, helikopter, spijkermatten · ze rammen', 'Forças especiais, helicóptero, pregos · abalroam'],
  ['HUBSCHRAUBER', 'HELICOPTER', 'HUBSCHRAUBER', 'HÉLICOPTÈRE', 'HELICÓPTERO', 'ELICOTTERO', 'HELIKOPTER', 'HELİKOPTER', 'HELIKOPTER', 'HELICÓPTERO'],
  ['Muss tanken · dreht ab', 'Low on fuel · turning away', 'Muss tanken · dreht ab', 'Plus de carburant · il s’éloigne', 'Sin combustible · se retira', 'Senza carburante · si allontana', 'Kończy się paliwo · odlatuje', 'Yakıtı bitiyor · uzaklaşıyor', 'Moet tanken · draait af', 'Sem combustível · afasta-se'],
  ['NAGELSPERRE VORAUS', 'SPIKE STRIP AHEAD', 'NAGELSPERRE VORAUS', 'HERSE DEVANT', 'PINCHOS DELANTE', 'CHIODI PIÙ AVANTI', 'KOLCZATKA PRZED TOBĄ', 'İLERİDE ÇİVİLİ ŞERİT', 'SPIJKERMAT VOORUIT', 'PREGOS À FRENTE'],
  ['Polizei legt Krallen aus · ausweichen!', 'Police are laying spikes · swerve!', 'Polizei legt Krallen aus · ausweichen!', 'La police pose une herse · évitez-la !', 'La policía pone pinchos · ¡esquiva!', 'La polizia stende i chiodi · scansali!', 'Policja rozkłada kolczatkę · omijaj!', 'Polis çivi döşüyor · kaç!', 'Politie legt spijkers · uitwijken!', 'A polícia põe pregos · desvia!'],
  ['REIFEN PLATT!', 'TYRES SHREDDED!', 'REIFEN PLATT!', 'PNEUS CREVÉS !', '¡RUEDAS PINCHADAS!', 'GOMME A TERRA!', 'OPONY PRZEBITE!', 'LASTİKLER PATLADI!', 'BANDEN LEK!', 'PNEUS FURADOS!'],
  ['Über die Nagelsperre gefahren', 'You drove over the spike strip', 'Über die Nagelsperre gefahren', 'Vous avez roulé sur la herse', 'Pasaste por encima de los pinchos', 'Sei passato sui chiodi', 'Przejechano po kolczatce', 'Çivili şeridin üstünden geçtin', 'Over de spijkermat gereden', 'Passaste por cima dos pregos'],
  ['MISSION COMPLETE', 'MISSION COMPLETE', 'AUFGABE ERFÜLLT', 'MISSION ACCOMPLIE', 'MISIÓN CUMPLIDA', 'MISSIONE COMPIUTA', 'MISJA WYKONANA', 'GÖREV TAMAMLANDI', 'MISSIE VOLTOOID', 'MISSÃO CUMPRIDA'],
  ['FINE WAIVED', 'FINE WAIVED', 'BUSSGELD ERLASSEN', 'AMENDE ANNULÉE', 'MULTA ANULADA', 'MULTA ANNULLATA', 'MANDAT ANULOWANY', 'CEZA SİLİNDİ', 'BOETE KWIJTGESCHOLDEN', 'MULTA ANULADA'],
  // ---- missions ----
  ['Get {n} near misses', 'Get {n} near misses', 'Schaffe {n} Beinahe-Unfälle', 'Faites {n} frôlements', 'Consigue {n} roces', 'Fai {n} sorpassi al pelo', 'Zalicz {n} mijanek o włos', '{n} kez kıl payı geç', 'Haal {n} bijna-botsingen', 'Faz {n} tangentes'],
  ['Drive {n} km', 'Drive {n} km', 'Fahre {n} km', 'Roulez {n} km', 'Conduce {n} km', 'Guida per {n} km', 'Przejedź {n} km', '{n} km sür', 'Rij {n} km', 'Conduz {n} km'],
  ['Reach {n} km/h', 'Reach {n} km/h', 'Erreiche {n} km/h', 'Atteignez {n} km/h', 'Alcanza {n} km/h', 'Raggiungi {n} km/h', 'Osiągnij {n} km/h', '{n} km/s’ye ulaş', 'Haal {n} km/u', 'Atinge {n} km/h'],
  ['Drive {n} km on country roads', 'Drive {n} km on country roads', 'Fahre {n} km auf Landstraßen', 'Roulez {n} km sur des routes de campagne', 'Conduce {n} km por carreteras comarcales', 'Guida per {n} km su strade provinciali', 'Przejedź {n} km drogami krajowymi', 'Köy yollarında {n} km sür', 'Rij {n} km over provinciale wegen', 'Conduz {n} km em estradas nacionais'],
  ['Drive {n} km off-road or on forest tracks', 'Drive {n} km off-road or on forest tracks', 'Fahre {n} km im Gelände oder auf Waldwegen', 'Roulez {n} km en tout-terrain ou sur des chemins forestiers', 'Conduce {n} km fuera de carretera o por pistas forestales', 'Guida per {n} km fuoristrada o nei boschi', 'Przejedź {n} km w terenie lub drogami leśnymi', 'Arazide veya orman yollarında {n} km sür', 'Rij {n} km offroad of over bospaden', 'Conduz {n} km fora de estrada ou em caminhos florestais'],
  ['Drive through {n} villages', 'Drive through {n} villages', 'Durchquere {n} Dörfer', 'Traversez {n} villages', 'Atraviesa {n} pueblos', 'Attraversa {n} paesi', 'Przejedź przez {n} wsie', '{n} köyden geç', 'Rij door {n} dorpen', 'Atravessa {n} aldeias'],
  ['Escape the police {n}×', 'Escape the police {n}×', 'Entkomme der Polizei {n}×', 'Échappez à la police {n}×', 'Escapa de la policía {n}×', 'Semina la polizia {n}×', 'Ucieknij policji {n}×', 'Polisten {n} kez kaç', 'Ontsnap {n}× aan de politie', 'Foge da polícia {n}×'],
  ['Get pulled over politely and take the ticket', 'Get pulled over politely and take the ticket', 'Lass dich höflich anhalten und nimm das Bußgeld', 'Laissez-vous arrêter poliment et payez l’amende', 'Déjate parar con educación y acepta la multa', 'Fatti fermare con calma e accetta la multa', 'Daj się grzecznie zatrzymać i przyjmij mandat', 'Kibarca kenara çek ve cezayı kabul et', 'Laat je netjes aanhouden en neem de boete', 'Deixa-te mandar parar e aceita a multa'],
  ['Take {n} Autobahn exits', 'Take {n} Autobahn exits', 'Nimm {n} Ausfahrten', 'Prenez {n} sorties d’autoroute', 'Toma {n} salidas de la autopista', 'Prendi {n} uscite autostradali', 'Zjedź {n} razy z autostrady', '{n} otoban çıkışı kullan', 'Neem {n} afritten', 'Sai {n} vezes da autoestrada'],
  ['Drive {n} km in one run without damage', 'Drive {n} km in one run without damage', 'Fahre {n} km am Stück ohne Schaden', 'Roulez {n} km d’affilée sans dégâts', 'Conduce {n} km seguidos sin daños', 'Guida per {n} km di fila senza danni', 'Przejedź {n} km bez uszkodzeń', 'Hasarsız tek seferde {n} km sür', 'Rij {n} km achter elkaar zonder schade', 'Conduz {n} km seguidos sem danos'],
  // ---- tutorial ----
  ['HOW TO DRIVE', 'HOW TO DRIVE', 'SO FÄHRST DU', 'COMMENT CONDUIRE', 'CÓMO CONDUCIR', 'COME SI GUIDA', 'JAK JEŹDZIĆ', 'NASIL SÜRÜLÜR', 'ZO RIJ JE', 'COMO CONDUZIR'],
  ['Steer with the ◀ ▶ buttons (or tilt the phone, see Settings). Gas is automatic; hold BRAKE to slow down. On a keyboard: W A S D.', 'Steer with the ◀ ▶ buttons (or tilt the phone, see Settings). Gas is automatic; hold BRAKE to slow down. On a keyboard: W A S D.', 'Lenke mit ◀ ▶ (oder neige das Handy, siehe Einstellungen). Gas geht automatisch; halte BREMSE zum Bremsen. Mit Tastatur: W A S D.', 'Dirigez avec ◀ ▶ (ou inclinez le téléphone, voir Réglages). L’accélération est automatique ; maintenez FREIN pour ralentir. Au clavier : W A S D.', 'Gira con ◀ ▶ (o inclina el móvil, ver Ajustes). El acelerador es automático; mantén FRENO para frenar. Con teclado: W A S D.', 'Sterza con ◀ ▶ (o inclina il telefono, vedi Impostazioni). L’acceleratore è automatico; tieni premuto FRENO per rallentare. Con tastiera: W A S D.', 'Skręcaj przyciskami ◀ ▶ (lub przechylaj telefon, patrz Ustawienia). Gaz jest automatyczny; przytrzymaj HAMULEC, by zwolnić. Klawiatura: W A S D.', '◀ ▶ ile direksiyonu çevir (veya telefonu eğ, bkz. Ayarlar). Gaz otomatik; yavaşlamak için FREN’e basılı tut. Klavyede: W A S D.', 'Stuur met ◀ ▶ (of kantel de telefoon, zie Instellingen). Gas gaat vanzelf; houd REM ingedrukt om af te remmen. Toetsenbord: W A S D.', 'Vira com ◀ ▶ (ou inclina o telemóvel, ver Definições). O acelerador é automático; mantém TRAVÃO para abrandar. Teclado: W A S D.'],
  ['TRAFFIC & POINTS', 'TRAFFIC & POINTS', 'VERKEHR & PUNKTE', 'TRAFIC & POINTS', 'TRÁFICO Y PUNTOS', 'TRAFFICO E PUNTI', 'RUCH I PUNKTY', 'TRAFİK VE PUAN', 'VERKEER & PUNTEN', 'TRÂNSITO E PONTOS'],
  ['Speed and close passes score points. Flash your lights (✦ or F) and slow cars move over. Take an Ausfahrt to explore country roads, villages and off-road tracks. Money from each run unlocks new cars.', 'Speed and close passes score points. Flash your lights (✦ or F) and slow cars move over. Take an Ausfahrt to explore country roads, villages and off-road tracks. Money from each run unlocks new cars.', 'Tempo und knappes Vorbeifahren bringen Punkte. Lichthupe (✦ oder F) und langsame Autos machen Platz. Nimm eine Ausfahrt zu Landstraßen, Dörfern und ins Gelände. Mit dem Geld jeder Fahrt schaltest du neue Autos frei.', 'La vitesse et les dépassements serrés rapportent des points. Faites un appel de phares (✦ ou F) et les voitures lentes s’écartent. Prenez une sortie pour explorer routes, villages et chemins. L’argent de chaque course débloque des voitures.', 'La velocidad y los adelantamientos ajustados dan puntos. Haz ráfagas (✦ o F) y los coches lentos se apartan. Toma una salida para explorar carreteras, pueblos y caminos. El dinero de cada partida desbloquea coches.', 'Velocità e sorpassi al pelo danno punti. Lampeggia (✦ o F) e le auto lente si spostano. Prendi un’uscita per strade di campagna, paesi e sterrati. I soldi di ogni corsa sbloccano nuove auto.', 'Prędkość i mijanie o włos dają punkty. Mrugnij światłami (✦ lub F), a wolne auta zjadą. Zjedź z autostrady na drogi, do wsi i w teren. Pieniądze z każdej jazdy odblokowują auta.', 'Hız ve yakın geçişler puan kazandırır. Selektör yap (✦ veya F), yavaş araçlar kenara çekilir. Çıkışlardan köy yollarına, köylere ve araziye git. Her sürüşün parası yeni araçların kilidini açar.', 'Snelheid en rakelings passeren levert punten op. Geef lichtsignalen (✦ of F) en langzame auto’s gaan opzij. Neem een afrit naar landwegen, dorpen en offroad. Geld van elke rit ontgrendelt nieuwe auto’s.', 'Velocidade e passagens rentes dão pontos. Faz sinais de luzes (✦ ou F) e os carros lentos afastam-se. Sai da autoestrada para estradas, aldeias e caminhos. O dinheiro de cada corrida desbloqueia carros.'],
  ['THE POLIZEI', 'THE POLIZEI', 'DIE POLIZEI', 'LA POLIZEI', 'LA POLIZEI', 'LA POLIZEI', 'POLIZEI', 'POLİZEİ', 'DE POLIZEI', 'A POLIZEI'],
  ['Hit a car and drive on, or race past a speed camera, and a patrol car comes. Follow it when it shows BITTE FOLGEN and stop behind it: just a fine. Run, and it becomes a chase with a helicopter, SEK vans and spike strips.', 'Hit a car and drive on, or race past a speed camera, and a patrol car comes. Follow it when it shows BITTE FOLGEN and stop behind it: just a fine. Run, and it becomes a chase with a helicopter, SEK vans and spike strips.', 'Fährst du nach einem Unfall weiter oder rast am Blitzer vorbei, kommt ein Streifenwagen. Folge ihm bei BITTE FOLGEN und halte hinter ihm: nur ein Bußgeld. Flüchtest du, wird es eine Verfolgung mit Hubschrauber, SEK und Nagelsperren.', 'Touchez une voiture et continuez, ou passez un radar trop vite, et une patrouille arrive. Suivez-la quand elle affiche BITTE FOLGEN et arrêtez-vous derrière : juste une amende. Fuyez, et c’est une poursuite avec hélicoptère, GIGN et herses.', 'Choca y sigue, o pasa un radar a toda velocidad, y llega una patrulla. Síguela cuando muestre BITTE FOLGEN y detente detrás: solo una multa. Huye y será una persecución con helicóptero, antidisturbios y pinchos.', 'Urta un’auto e prosegui, o sfreccia davanti a un autovelox, e arriva una volante. Seguila quando mostra BITTE FOLGEN e fermati dietro: solo una multa. Scappa e sarà un inseguimento con elicottero, teste di cuoio e chiodi.', 'Uderz w auto i odjedź albo przemknij obok fotoradaru, a przyjedzie radiowóz. Jedź za nim, gdy pokaże BITTE FOLGEN, i stań za nim: tylko mandat. Uciekaj, a będzie pościg z helikopterem, antyterrorystami i kolczatkami.', 'Bir araca çarpıp devam edersen veya radardan hızla geçersen bir devriye gelir. BITTE FOLGEN yazınca onu takip et ve arkasında dur: sadece ceza. Kaçarsan helikopter, özel tim ve çivili şeritlerle kovalamaca başlar.', 'Raak een auto en rij door, of scheur langs een flitser, en er komt een politieauto. Volg hem bij BITTE FOLGEN en stop erachter: alleen een boete. Vlucht je, dan volgt een achtervolging met helikopter, arrestatieteam en spijkermatten.', 'Bate num carro e segue, ou passa um radar a abrir, e vem uma patrulha. Segue-a quando mostrar BITTE FOLGEN e para atrás dela: só uma multa. Foge e é uma perseguição com helicóptero, forças especiais e pregos.'],
  ['NEXT', 'NEXT', 'WEITER', 'SUIVANT', 'SIGUIENTE', 'AVANTI', 'DALEJ', 'İLERİ', 'VOLGENDE', 'SEGUINTE'],
  ["LET'S GO", "LET'S GO", 'LOS GEHT’S', 'C’EST PARTI', 'VAMOS', 'ANDIAMO', 'JEDZIEMY', 'HADİ', 'RIJDEN MAAR', 'VAMOS'],
  ['SKIP', 'SKIP', 'ÜBERSPRINGEN', 'PASSER', 'SALTAR', 'SALTA', 'POMIŃ', 'ATLA', 'OVERSLAAN', 'SALTAR'],
  // ---- ad placeholder ----
  ['Werbung', 'Advertisement', 'Werbung', 'Publicité', 'Anuncio', 'Pubblicità', 'Reklama', 'Reklam', 'Advertentie', 'Publicidade'],
  ['CLAIM REWARD', 'CLAIM REWARD', 'BELOHNUNG ABHOLEN', 'RÉCUPÉRER LA RÉCOMPENSE', 'RECLAMAR RECOMPENSA', 'RISCATTA PREMIO', 'ODBIERZ NAGRODĘ', 'ÖDÜLÜ AL', 'BELONING OPHALEN', 'RECEBER RECOMPENSA'],
  ['CLOSE', 'CLOSE', 'SCHLIESSEN', 'FERMER', 'CERRAR', 'CHIUDI', 'ZAMKNIJ', 'KAPAT', 'SLUITEN', 'FECHAR'],
  ['Skip (no reward)', 'Skip (no reward)', 'Überspringen (keine Belohnung)', 'Passer (sans récompense)', 'Saltar (sin recompensa)', 'Salta (nessun premio)', 'Pomiń (bez nagrody)', 'Atla (ödül yok)', 'Overslaan (geen beloning)', 'Saltar (sem recompensa)'],
];

const TABLE = new Map(); const PATTERNS = [];
for (const row of D) {
  const [key, ...vals] = row; const tr = {}; LANGS.forEach((l, i) => { tr[l] = vals[i] ?? vals[0]; }); TABLE.set(key, tr);
  if (/\{(\d|n)\}/.test(key)) { const names = []; const re = new RegExp('^' + key.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d|n)\}/g, (m, g) => { names.push(g); return '(.+?)'; }) + '$'); PATTERNS.push({ re, names, tr }); }
}

let lang = 'en';
export const getLang = () => lang;
/** pick the language: a saved choice, or the device's language (falls back to English) */
export function resolveLang(choice) {
  if (choice && choice !== 'auto' && LANGS.includes(choice)) return choice;
  for (const l of navigator.languages || [navigator.language || 'en']) { const k = String(l).slice(0, 2).toLowerCase(); if (LANGS.includes(k)) return k; }
  return 'en';
}
/** translate one string; unknown strings come back as they are */
export function t(s, vars) {
  if (s == null || s === '') return s;
  const hit = TABLE.get(s); if (hit) return fill(hit[lang], vars);
  for (const p of PATTERNS) { const m = p.re.exec(s); if (!m) continue; let out = p.tr[lang]; p.names.forEach((n, i) => { out = out.split(`{${n}}`).join(m[i + 1]); }); return out; }
  return s;
}
const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : s);

// translate the static page: every text node and placeholder, remembering the original
const ORIG = new WeakMap();
export function applyLang(code, root = document.body) {
  lang = code; document.documentElement.lang = code;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && !n.parentElement.closest('kbd,script,style,[data-noi18n]') && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!ORIG.has(n)) ORIG.set(n, n.nodeValue);
    const src = ORIG.get(n), lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0], core = src.trim();
    let out = t(core);
    if (out === core) { const m = /^(.*?)(\s*·)$/.exec(core); if (m) { const o2 = t(m[1]); if (o2 !== m[1]) out = o2 + m[2]; } }   // "drive ·" between key labels
    if (out !== core || n.nodeValue.trim() !== core) n.nodeValue = lead + out + trail;
  }
}
