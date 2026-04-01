/**
 * Script de migration : ajoute les colonnes editedText et segmentsData
 * à la table transcriptions sans supprimer les colonnes existantes.
 * 
 * Usage : node scripts/add-editor-columns.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL non défini");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  console.log("🔍 Vérification des colonnes existantes...");

  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transcriptions'`
  );
  const existingColumns = columns.map((c) => c.COLUMN_NAME);
  console.log("Colonnes existantes :", existingColumns.join(", "));

  // Ajouter editedText si absent
  if (!existingColumns.includes("editedText")) {
    await connection.execute(
      `ALTER TABLE transcriptions ADD COLUMN editedText TEXT NULL AFTER transcriptText`
    );
    console.log("✅ Colonne editedText ajoutée");
  } else {
    console.log("ℹ️  Colonne editedText déjà présente");
  }

  // Ajouter segmentsData si absent
  if (!existingColumns.includes("segmentsData")) {
    await connection.execute(
      `ALTER TABLE transcriptions ADD COLUMN segmentsData TEXT NULL AFTER editedText`
    );
    console.log("✅ Colonne segmentsData ajoutée");
  } else {
    console.log("ℹ️  Colonne segmentsData déjà présente");
  }

  console.log("🎉 Migration terminée avec succès");
} catch (err) {
  console.error("❌ Erreur de migration :", err.message);
  process.exit(1);
} finally {
  await connection.end();
}
