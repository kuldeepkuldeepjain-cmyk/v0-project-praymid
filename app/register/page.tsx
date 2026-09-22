import { redirect } from "next/navigation"

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item)
    } else if (value !== undefined) {
      query.set(key, value)
    }
  }

  const queryString = query.toString()
  redirect(`/participant/register${queryString ? `?${queryString}` : ""}`)
}
