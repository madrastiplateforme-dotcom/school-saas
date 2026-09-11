'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { Plus, Trash2, Users, Shield } from 'lucide-react'

type UserProfile = {
  user_id: string
  full_name: string
  role_id: string | null
  roles: { name: string } | null
}

type Role = {
  id: string
  name: string
}

export default function UsersPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewUsers = hasPermission('users', 'view')
  const canCreateUsers = hasPermission('users', 'create')

  const [users, setUsers] = useState<UserProfile[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchData(establishmentId)
  }, [establishmentId])

  const fetchData = async (sid: string) => {
    const supabase = createClient()

    const { data: usersData, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        user_id, full_name, role_id,
        roles (name)
      `)
      .eq('establishment_id', sid)

    if (usersError) setError(usersError.message)
    else setUsers(usersData || [])

    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('establishment_id', sid)

    if (rolesError) setError(rolesError.message)
    else setRoles(rolesData || [])

    setLoading(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId || !fullName.trim() || !email || !password || !roleId) {
      setError('جميع الحقول إجبارية')
      return
    }

    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/dashboard/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          roleId,
          establishmentId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      setFullName('')
      setEmail('')
      setPassword('')
      setRoleId('')
      fetchData(establishmentId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('هل تريد حذف هذا المستخدم؟')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)

    if (error) setError(error.message)
    else fetchData(establishmentId!)
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewUsers) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-600" />
          Utilisateurs
        </h1>
        <p className="text-gray-600">Gérez les utilisateurs et leurs rôles</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {canCreateUsers ? (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Ajouter un utilisateur</h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom complet</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rôle</label>
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="">-- Sélectionner --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={creating} className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <Plus className="h-4 w-4" />
                {creating ? 'Création...' : 'Créer utilisateur'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
          ليس لديك صلاحية لإنشاء المستخدمين.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Utilisateurs ({users.length})</h2>
        {users.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun utilisateur.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nom complet</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rôle</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name || 'بدون اسم'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-4 w-4 text-indigo-500" />
                      {user.roles?.name || 'بدون دور'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button onClick={() => handleDeleteUser(user.user_id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}