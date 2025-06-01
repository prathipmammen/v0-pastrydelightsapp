// WebAuthn utility functions for Face ID and biometric authentication

export interface WebAuthnCredential {
  id: string
  rawId: ArrayBuffer
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse
  type: "public-key"
}

export interface WebAuthnOptions {
  challenge: Uint8Array
  rp: {
    name: string
    id: string
  }
  user: {
    id: Uint8Array
    name: string
    displayName: string
  }
  pubKeyCredParams: Array<{
    alg: number
    type: "public-key"
  }>
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform"
    userVerification?: "required" | "preferred" | "discouraged"
    requireResidentKey?: boolean
  }
  timeout?: number
  attestation?: "none" | "indirect" | "direct"
}

// Check if WebAuthn is supported
export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get)
}

// Check if platform authenticator (Face ID/Touch ID) is available
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (error) {
    console.error("Error checking platform authenticator:", error)
    return false
  }
}

// Generate a random challenge
export function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

// Convert string to Uint8Array
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// Convert ArrayBuffer to base64url
export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

// Convert base64url to ArrayBuffer
export function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Create WebAuthn credential (registration)
export async function createCredential(options: WebAuthnOptions): Promise<WebAuthnCredential> {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: options.challenge,
        rp: options.rp,
        user: options.user,
        pubKeyCredParams: options.pubKeyCredParams,
        authenticatorSelection: options.authenticatorSelection || {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: options.timeout || 60000,
        attestation: options.attestation || "none",
      },
    })) as PublicKeyCredential

    if (!credential) {
      throw new Error("Failed to create credential")
    }

    return credential as WebAuthnCredential
  } catch (error) {
    console.error("WebAuthn registration error:", error)
    throw error
  }
}

// Get WebAuthn credential (authentication)
export async function getCredential(
  challenge: Uint8Array,
  allowCredentials?: Array<{ id: ArrayBuffer; type: "public-key" }>,
): Promise<WebAuthnCredential> {
  try {
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: allowCredentials || [],
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential

    if (!credential) {
      throw new Error("Failed to get credential")
    }

    return credential as WebAuthnCredential
  } catch (error) {
    console.error("WebAuthn authentication error:", error)
    throw error
  }
}

// Store credential info in localStorage (in production, store on server)
export function storeCredentialInfo(credentialId: string, userEmail: string): void {
  const credentials = getStoredCredentials()
  credentials[userEmail] = credentialId
  localStorage.setItem("webauthn_credentials", JSON.stringify(credentials))
}

// Get stored credentials
export function getStoredCredentials(): Record<string, string> {
  try {
    const stored = localStorage.getItem("webauthn_credentials")
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Get credential ID for user
export function getCredentialIdForUser(userEmail: string): string | null {
  const credentials = getStoredCredentials()
  return credentials[userEmail] || null
}

// Remove stored credential
export function removeStoredCredential(userEmail: string): void {
  const credentials = getStoredCredentials()
  delete credentials[userEmail]
  localStorage.setItem("webauthn_credentials", JSON.stringify(credentials))
}
