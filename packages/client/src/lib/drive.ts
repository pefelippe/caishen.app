import { authClient } from './auth';

/** Only files the User picks become visible to zapbots (non-sensitive scope). */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
/** The Google Cloud project number; lets `drive.file` cover the picked files. */
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID as string | undefined;

export interface PickedFile {
  fileId: string;
  mimeType: string;
  name: string;
  url: string;
}

/** True when the client has what the Google Picker needs. */
export const pickerConfigured = () => Boolean(API_KEY && APP_ID);

/** Sends the User to Google to grant the Drive scope, then back to the Connections page. */
export async function connectDrive(): Promise<string | null> {
  const result = await authClient.linkSocial({
    callbackURL: `${window.location.origin}/integrations/files`,
    provider: 'google',
    scopes: [DRIVE_SCOPE],
  });
  return result.error ? (result.error.message ?? 'Não foi possível conectar o Drive') : null;
}

interface PickerDocument {
  id: string;
  mimeType: string;
  name: string;
  url: string;
}

// The slice of the Google Picker API used here; the script ships no types.
interface PickerBuilder {
  addView(view: unknown): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
  setAppId(id: string): PickerBuilder;
  setCallback(callback: (data: { action: string; docs?: PickerDocument[] }) => void): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setLocale(locale: string): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
}

declare global {
  interface Window {
    gapi?: { load(name: string, callback: () => void): void };
    google?: {
      picker: {
        Action: { PICKED: string };
        PickerBuilder: new () => PickerBuilder;
        ViewId: { DOCS: unknown };
      };
    };
  }
}

let pickerReady: Promise<void> | null = null;

function loadPicker(): Promise<void> {
  pickerReady ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => window.gapi!.load('picker', resolve);
    script.onerror = () => {
      pickerReady = null;
      reject(new Error('Não foi possível carregar o seletor do Google'));
    };
    document.head.append(script);
  });
  return pickerReady;
}

async function googleAccessToken(): Promise<string> {
  const accounts = await authClient.listAccounts();
  const google = accounts.data?.find(account => account.providerId === 'google');
  if (!google) throw new Error('Entre com sua conta Google para usar o Drive');
  const token = await authClient.getAccessToken({ accountId: google.id });
  if (!token.data?.accessToken) throw new Error('O Google não liberou o acesso ao Drive');
  return token.data.accessToken;
}

/** Opens Google's own file picker; resolves with the chosen file, or `null` when dismissed. */
export async function pickDriveFile(): Promise<PickedFile | null> {
  if (!API_KEY || !APP_ID) {
    throw new Error(
      'Faltam VITE_GOOGLE_API_KEY e VITE_GOOGLE_APP_ID para abrir o seletor do Google'
    );
  }
  const [token] = await Promise.all([googleAccessToken(), loadPicker()]);
  const { picker } = window.google!;
  return new Promise(resolve => {
    new picker.PickerBuilder()
      .addView(picker.ViewId.DOCS)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setLocale('pt-BR')
      .setCallback(data => {
        if (data.action === picker.Action.PICKED && data.docs?.[0]) {
          const [file] = data.docs;
          resolve({ fileId: file.id, mimeType: file.mimeType, name: file.name, url: file.url });
        } else if (data.action === 'cancel') resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
