# Tickets

**Euer erster Besuch einer Casual Session ist umsonst!**

Das Ticket ist ab Kauf für den angegebenen Zeitraum gültig. Ihr willigt ein, die Regeln und die Hausordnung einzuhalten.
Vor Ort zeigt ihr einem Stamm-Member die Paypal Nachricht als Nachweis vor (auf Handy reicht) und bekommt ein Bändchen. Barzahlung ist nicht möglich. Das Ticket berechtigt euch zum Eintritt und zur Nutzung der Stations und der Stream-Station in Absprache mit Stammgästen vor Ort.

Wenn ihr kein Paypal habt, könnt ihr vor Ort jemanden bitten euch das Ticket zu kaufen.

Mit dem Kauf erhalte ich eure Paypal E-Mail Adresse, Namen und den Betreff den ihr angebt. Die E-Mail Adresse wird nach einem Jahr anonymisiert. Gebt als Betreff bitte die jeweilige Ticketart und den Zeitpunkt an (z.b. "kommendes Wochenende").

Vor Ort werden Foto und Video-Aufnahmen gemacht, live auf Twitch übertragen sowie auf Social Media und Foren (HardEdge.org) geteilt um Werbung für die Location zu machen.

<hr>

Die Tickets gelten auch nur, wenn die Location offen hat. Informiert euch vorher im [Kalender](https://calendar.google.com/calendar/embed?src=kqg40hjscfpnkm780rhd7abr5s%40group.calendar.google.com&ctz=Europe%2FBerlin) oder [Discord](https://tinyurl.com/madgearffm)!
 
**Tourist (Tagesgast)**: 10€, gilt am Kaufdatum bis zum nächsten Tag 4 Uhr Morgens.

**Goon (Wochenende)**: 15€, gilt für das Wochenende.
Maximal Freitag 18:00 - Sonntag 18:00.

**Supergoon (Dauergast)**: 25€, gilt für den Monat in dem ihr es gekauft habt.

**Spender (virtueller Döner)**: 5€, wir freuen uns über jede Spende und werden dir einen Shoutout auf dem Stream geben.

**Ringleader**: Stamm-Member mit Verantwortung. Auf Anfrage.

<hr>

<input type="checkbox" id="gelesen" onclick="gelesen()"> Ich akzeptiere die o.g. Bestimmungen, [AGB](./agb.md) und [Regeln](./regeln.md).

<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" id="text" style="display:none">
<input type="hidden" name="cmd" value="_s-xclick">
<input type="hidden" name="hosted_button_id" value="WCHKEZZZB2BJL">
<table>
<tr><td><input type="hidden" name="on0" value="Dauer">Dauer</td></tr><tr><td><select name="os0">
	<option value="Tourist (1 Tag)">Tourist (1 Tag) €10,00 EUR</option>
	<option value="Goon (Wochenende)">Goon (Wochenende) €15,00 EUR</option>
	<option value="Supergoon (Monat)">Supergoon (Monat) €25,00 EUR</option>
	<option value="Spender">Spender €5,00 EUR</option>
</select> </td></tr>
<tr><td><input type="hidden" name="on1" value="Nickname">Nickname</td></tr><tr><td><input type="text" name="os1" maxlength="200"></td></tr>
</table>
<input type="hidden" name="currency_code" value="EUR">
<input type="image" src="https://www.paypalobjects.com/de_DE/DE/i/btn/btn_buynowCC_LG.gif" border="0" name="submit" alt="Jetzt einfach, schnell und sicher online bezahlen – mit PayPal.">
<img alt="" border="0" src="https://www.paypalobjects.com/de_DE/i/scr/pixel.gif" width="1" height="1">
<br>
Alternativ direkt an: MadGearFFM@gmail.com<br>
Betreff: Nickname + Datum
</form>

Supergoon Abo via Paypal:
<div id="paypal-button-container-P-04C428923N755423BMLUOVNI"></div>
<script src="https://www.paypal.com/sdk/js?client-id=AYgAZUl1zBsCbMSFFQShxUdl8pZc-31kqnd6O3vK4Xte8SUxty9JdRRs9diySzXW0AKXObdYTreh5-vs&vault=true&intent=subscription" data-sdk-integration-source="button-factory"></script>
<script>
  paypal.Buttons({
      style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe'
      },
      createSubscription: function(data, actions) {
        return actions.subscription.create({
          /* Creates the subscription */
          plan_id: 'P-04C428923N755423BMLUOVNI'
        });
      },
      onApprove: function(data, actions) {
        alert(data.subscriptionID); // You can add optional success message for the subscriber here
      }
  }).render('#paypal-button-container-P-04C428923N755423BMLUOVNI'); // Renders the PayPal button
</script>
