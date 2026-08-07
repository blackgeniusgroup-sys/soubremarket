const prisma = require("./prisma");

async function getProfileByUserId(user_id) {
  const [superAdmin, admin, client, vendor, livreur] = await Promise.all([
    prisma.superadmins.findUnique({ where: { user_id } }),
    prisma.admins.findUnique({ where: { user_id } }),
    prisma.client.findUnique({ where: { userId: user_id } }),
    prisma.vendor.findUnique({ where: { userId: user_id } }),
    prisma.livreur.findUnique({ where: { userId: user_id } })
  ]);

  if (superAdmin) return { ...superAdmin, type: "superadmin" };
  if (admin) return { ...admin, type: "admin" };
  if (client) return { ...client, type: "client" };
  if (vendor) return { ...vendor, type: "vendor" };
  if (livreur) return { ...livreur, type: "livreur" };

  return null;
}

module.exports = { getProfileByUserId };
