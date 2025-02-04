const express = require("express");
const { google } = require("googleapis");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

const SHEET_ID = process.env.SHEET_ID; // ID da planilha
const RANGE = "A:A"; // Coluna onde os números estão armazenados

// Autenticação com Google Sheets API
async function getAuthSheets() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json", // Arquivo de credenciais do Google
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    return sheets;
}

// Normaliza o número para um formato padrão
function normalizePhoneNumber(phone) {
    return phone
        .replace(/\D/g, "")  // Remove tudo que não for número
        .replace(/^0+/, "")  // Remove zeros à esquerda
        .replace(/^(\d{2})(\d{8,9})$/, "55$1$2"); // Adiciona 55 se precisar
}

// Função para buscar os números da planilha
async function getPhoneNumbers() {
    try {
        const sheets = await getAuthSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: RANGE,
        });

        return response.data.values ? response.data.values.flat().map(normalizePhoneNumber) : [];
    } catch (error) {
        console.error("Erro ao acessar a planilha:", error);
        throw new Error("Erro ao acessar a planilha");
    }
}

// Rota para validar número de telefone
app.post("/api/validate", async (req, res) => {
    let { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: "Número de telefone é obrigatório" });
    }

    try {
        const normalizedPhone = normalizePhoneNumber(phone);
        const phoneNumbers = await getPhoneNumbers();

        if (phoneNumbers.includes(normalizedPhone)) {
            return res.json({ valid: true, message: "Esse número PERTENCE à nossa empresa." });
        } else {
            return res.json({ valid: false, message: "Esse número NÃO PERTENCE à nossa empresa." });
        }
    } catch (error) {
        return res.status(500).json({ error: "Erro ao acessar a planilha", details: error.message });
    }
});

// Inicia o servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
