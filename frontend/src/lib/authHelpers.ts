import supabase from './supabase'

export async function sendPasswordReset(email: string) {
  if (!email) throw new Error('Email is required')
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  return { error }
}
