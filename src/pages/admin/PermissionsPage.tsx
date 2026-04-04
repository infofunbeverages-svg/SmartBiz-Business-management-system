const handlePermissionChange = async (userId: string, moduleId: string, value: boolean) => {
  const user = users.find(u => u.id === userId);
  const updatedPermissions = { ...user.permissions, [moduleId]: value };
  
  // Backwards compatibility for legacy columns
  const extraUpdates: any = {};
  if (moduleId === 'inventory') extraUpdates.inventory_access = value;
  if (moduleId === 'orders') extraUpdates.invoice_access = value;

  setSaving(userId + moduleId);
  const { error } = await supabase
    .from('profiles')
    .update({ 
      permissions: updatedPermissions,
      ...extraUpdates 
    })
    .eq('id', userId);

  if (!error) {
    setUsers(users.map(u => u.id === userId ? { ...u, permissions: updatedPermissions, ...extraUpdates } : u));
  } else {
    console.error("Update Error:", error);
    alert("Authorization Error: Could not update access levels.");
  }
  setSaving(null);
};