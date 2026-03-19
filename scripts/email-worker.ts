/**
 * Cloudflare Email Worker Template for PrintFrenzy
 * 
 * Instructions:
 * 1. Create a new "Email Worker" in Cloudflare.
 * 2. Paste this code.
 * 3. Set the following Environment Variables in the Worker settings:
 *    - IMPORT_API_URL: https://your-app-url.pages.dev/api/orders/import
 *    - IMPORT_API_KEY: Match this with your AUTH_SECRET or a custom API_IMPORT_KEY
 */

import PostalMime from 'postal-mime';

export default {
  async email(message: any, env: any, ctx: any) {
    const parser = new PostalMime();
    const email = await parser.parse(message.raw);
    const logs: string[] = [];
    const log = (msg: string) => {
      console.log(msg);
      logs.push(`${new Date().toISOString()}: ${msg}`);
    };

    log(`Received email from: ${message.from}`);

    // Look for CSV attachments
    const csvAttachments = email.attachments.filter((att: any) => 
      att.filename.toLowerCase().endsWith('.csv') || 
      att.mimeType === 'text/csv'
    );

    if (csvAttachments.length === 0) {
      log("No CSV attachments found. Skipping.");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const attachment of csvAttachments) {
      log(`Processing attachment: ${attachment.filename}`);
      
      const formData = new FormData();
      const blob = new Blob([attachment.content], { type: 'text/csv' });
      formData.append('file', blob, attachment.filename);

      try {
        const response = await fetch(env.IMPORT_API_URL, {
          method: 'POST',
          headers: { 'x-api-key': env.IMPORT_API_KEY },
          body: formData
        });

        if (response.ok) {
          const result = (await response.json()) as any;
          successCount += result.count;
          log(`Successfully imported ${result.count} orders from ${attachment.filename}`);
        } else {
          failCount++;
          const errorText = await response.text();
          log(`FAILED to import ${attachment.filename}: ${errorText}`);
        }
      } catch (err: any) {
        failCount++;
        log(`CRITICAL ERROR during ${attachment.filename} import: ${err.message}`);
      }
    }

    // If any failures occurred, reply to the sender with the logs
    if (failCount > 0) {
      const replyBody = `
PrintFrenzy Import Report (FAILURE)
      
Your recent CSV import attempt encountered errors.
Total Success: ${successCount} orders
Total Failed: ${failCount} files

Detailed Log:
${logs.join('\n')}

Please check your CSV format and try again.
      `.trim();

      // Cloudflare EmailMessage requires a raw email string for the body
      const rawReply = `From: ${message.to}\r\nTo: ${message.from}\r\nSubject: Import Failure: PrintFrenzy\r\n\r\n${replyBody}`;
      
      try {
        // Attempting to use the new reply() method (Check Cloudflare compatibility)
        if (typeof message.reply === 'function') {
          // @ts-expect-error - reply exists in Email Workers
          await message.reply(new EmailMessage(message.to, message.from, rawReply));
          console.log("Sent failure reply to sender.");
        }
      } catch (e) {
        console.error("Failed to send reply:", e);
      }
    }
  }
}
