import supabase from './supabase'

export async function sendPasswordReset(email: string) {
  if (!email) throw new Error('Email is required')
  const redirectTo = `${window.location.origin}/profile?changePassword=true`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  return { error }
}
