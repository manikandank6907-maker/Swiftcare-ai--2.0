import { defineConfig } from 'vite';
import { GoogleGenAI } from '@google/genai';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    {
      name: 'swiftcare-ai-assistant-api',
      configureServer(server) {
        server.middlewares.use('/api/assistant', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const { message, language = 'en-US' } = parsed;

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    fallback: true,
                    reply: null,
                    note: 'Server-side GEMINI_API_KEY not configured, using clinical fallback engine.',
                  })
                );
                return;
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build',
                  },
                },
              });

              const systemInstruction = `You are the SwiftCare AI Care Navigation Assistant for the website "SWIFTCARE AI" (Tagline: "Healthcare, Without the Wait.").
Your role is to help users navigate appointment booking, understand care categories (Urgent Care, Primary Care, Community Clinics, Home Visits, Telehealth), and identify suitable nearby appointment requests.

CRITICAL HEALTHCARE & SAFETY POLICIES:
1. NEVER diagnose illnesses, conditions, or disease states.
2. NEVER prescribe, recommend, or modify medications or specific clinical dosages.
3. If the user mentions any emergency signs (severe chest pain, difficulty breathing, stroke symptoms such as facial drooping/arm weakness/slurred speech, heavy uncontrolled bleeding, sudden vision loss, severe allergic reaction/anaphylaxis, high fever with stiff neck, or thoughts of self-harm):
   - Immediately start your reply with an alert in BOLD: "EMERGENCY NOTICE: If you are experiencing a life-threatening emergency, immediately call 911 (or your local emergency number like 112 / 999) or proceed to the nearest Emergency Room. SwiftCare AI does not provide emergency dispatch or hospital emergency care."
4. SwiftCare AI connects users with earlier appointment discovery and booking requests. Explain that all requests require review and confirmation by the healthcare provider's human staff and are not guaranteed immediate bookings.
5. Provide helpful, empathetic, concise advice in the user's preferred language: ${language}.
6. Structure responses with bullet points, clear headings, and actionable next steps.`;

              const response = await ai.models.generateContent({
                model: 'gemini-4-hydrogen',
                contents: message,
                config: {
                  systemInstruction,
                },
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply: response.text || 'I am ready to help you find care.',
                  fallback: false,
                })
              );
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.error('Gemini Assistant Error:', errMsg);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  fallback: true,
                  error: errMsg,
                })
              );
            }
          });
        });

        server.middlewares.use('/api/analyze-document', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const chunks: Buffer[] = [];
          let totalBytes = 0;
          const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB cap for base64 payloads

          req.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes <= MAX_BODY_BYTES) {
              chunks.push(chunk);
            }
          });

          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            if (totalBytes > MAX_BODY_BYTES) {
              res.statusCode = 413;
              res.end(
                JSON.stringify({
                  error: 'Document exceeds the 12 MB server analysis limit. Please select a smaller file.',
                })
              );
              return;
            }

            try {
              const bodyStr = Buffer.concat(chunks).toString('utf8');
              const parsed = JSON.parse(bodyStr || '{}');
              const {
                fileName = 'Document',
                mimeType = 'text/plain',
                textContent = '',
                base64Data = '',
                userQuestion = '',
                language = 'en-US',
              } = parsed;

              if (!textContent && !base64Data) {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    error: 'No readable document content was provided for analysis.',
                  })
                );
                return;
              }

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 503;
                res.end(
                  JSON.stringify({
                    error: 'Gemini AI document analysis requires GEMINI_API_KEY configured in server environment secrets.',
                    missingKey: true,
                  })
                );
                return;
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build',
                  },
                },
              });

              const systemInstruction = `You are the SwiftCare AI Document Navigation & Preparation Assistant for "SWIFTCARE AI" ("Healthcare, Without the Wait.").
Your role is to help patients read and organize their personal care documents (appointment summaries, referral notes, visit instructions, or clinic forms) in plain, accessible language so they can prepare for upcoming healthcare appointments.

STRICT SAFETY, PRIVACY & COMPLIANCE RULES:
1. NEVER diagnose any medical condition, interpret test results as a clinical diagnosis, or state what disease a patient has.
2. NEVER prescribe, adjust, or recommend medications, dosages, or treatments.
3. NEVER claim HIPAA compliance or act as a medical provider.
4. NEVER fabricate doctor names, credentials, or external clinic directories.
5. If the document or user question indicates any acute life-threatening emergency (chest pain, difficulty breathing, stroke signs, severe bleeding, anaphylaxis, self-harm), immediately begin with:
   "**EMERGENCY NOTICE:** If you are experiencing a life-threatening emergency, call 911 (or local emergency services like 112 / 999) or go to the nearest Emergency Room immediately."
6. Respond in the user's preferred language: ${language}.
7. Format the output cleanly with these markdown sections:
   - **Document Overview** (2-3 plain-language sentences summarizing what this document is about)
   - **Key Details & Terms Explained** (bullet points explaining administrative details, dates, care instructions, or plain-language definitions without diagnosing)
   - **Questions to Ask Your Healthcare Provider** (3-5 practical appointment preparation questions)
   - **Care Category Alignment & Safety Reminder** (which SwiftCare AI category fits best—Urgent Care, Primary Care, Clinics, Home Visits, or Telehealth—plus a brief non-diagnostic reminder).`;

              const promptHeader = `Analyze the following document titled "${fileName}" (${mimeType}).${
                userQuestion ? `\nSpecific patient question to address safely: "${userQuestion}"` : ''
              }`;

              let contents: string | { parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> };

              if (base64Data) {
                contents = {
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                    {
                      text: promptHeader,
                    },
                  ],
                };
              } else {
                const truncatedText = String(textContent).slice(0, 60000);
                contents = `${promptHeader}\n\n--- DOCUMENT CONTENT ---\n${truncatedText}`;
              }

              const response = await ai.models.generateContent({
                model: 'gemini-4-hydrogen',
                contents,
                config: {
                  systemInstruction,
                },
              });

              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  analysis: response.text || 'Unable to generate summary for this document.',
                  fallback: false,
                })
              );
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.error('Gemini Document Analysis Error:', errMsg);
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  error: `Gemini AI document analysis failed: ${errMsg}`,
                })
              );
            }
          });
        });
      },
    },
  ],
});
