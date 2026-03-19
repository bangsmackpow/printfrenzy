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
  async email(message, env, ctx) {
    const parser = new PostalMime();
    const email = await parser.parse(message.raw);

    // Look for CSV attachments
    const csvAttachments = email.attachments.filter(att => 
      att.filename.toLowerCase().endsWith('.csv') || 
      att.mimeType === 'text/csv'
    );

    if (csvAttachments.length === 0) {
      console.log("No CSV attachments found. Skipping.");
      return;
    }

    for (const attachment of csvAttachments) {
      console.log(`Processing attachment: ${attachment.filename}`);
      
      const formData = new FormData();
      // Convert attachment content (ArrayBuffer) to a Blob for FormData
      const blob = new Blob([attachment.content], { type: 'text/csv' });
      formData.append('file', blob, attachment.filename);

      try {
        const response = await fetch(env.IMPORT_API_URL, {
          method: 'POST',
          headers: {
            'x-api-key': env.IMPORT_API_KEY
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully imported ${result.count} orders from ${attachment.filename}`);
        } else {
          const errorText = await response.text();
          console.error(`Failed to import ${attachment.filename}:`, errorText);
        }
      } catch (err) {
        console.error(`Error sending ${attachment.filename} to API:`, err);
      }
    }
  }
}
