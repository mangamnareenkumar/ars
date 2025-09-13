import ejs from "ejs";
import path from "path";

const __dirname = import.meta.dirname;

export const generateDummyCertificate = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { 
      certificationTitle, 
      student_name, 
      issuer, 
      issueDate, 
      expiryDate,
      credentialId,
      validationUrl = "https://ofzen.in",
      logo = `${baseUrl}/api/reports/images/certificate.png`
    } = req.body;

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/dummy-certificate.ejs"),
      { certificationTitle, student_name, issuer, issueDate, expiryDate, credentialId, validationUrl, logo }
    );

    res.set("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("Certificate HTML generation error:", err);
    res.status(500).json({ error: "Failed to generate certificate HTML" });
  }
};
