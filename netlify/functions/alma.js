const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // Solo aceptar POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const userMessage = body.message || "";
    const history = body.history || [];

    // System prompt de Alma
    const systemPrompt = `Eres Alma, la asistente virtual de Tucirugia, plataforma digital de salud basada en Saltillo, Coahuila, México. Tu misión es orientar a los pacientes sobre procedimientos quirúrgicos, conectarlos con cirujanos certificados y ayudarlos a entender las opciones de financiamiento disponibles.

Hospitales aliados: Christus Muguerza, Hospital Human, Santa Elena y Santa Teresa (todos en Saltillo).
Financiamiento: Alivio Capital.
Procedimientos disponibles: vesícula, hernias, tiroides, apendicitis, lipomas, hemorroides.

Siempre comunícate en español, con un tono cálido, profesional y empático. Tu objetivo es recopilar el nombre del paciente, su número de teléfono y el procedimiento de interés para conectarlos con el equipo de Tucirugia. 

Cuando tengas nombre, teléfono y procedimiento, confirma los datos al paciente y dile que el equipo se pondrá en contacto muy pronto.`;

    // Construir historial de mensajes
    const messages = [
      ...history,
      { role: "user", content: userMessage },
    ];

    // Llamada a Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de Anthropic API:", errorData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error al contactar la IA", detail: errorData }),
      };
    }

    const data = await response.json();
    const reply = data.content[0].text;

    // Detectar si Alma recopiló los 3 datos clave (nombre, teléfono, procedimiento)
    // Esta lógica puedes expandirla según necesites
    const leadDetected =
      /\d{10}/.test(userMessage) || /teléfono|celular|número/i.test(reply);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reply: reply,
        leadDetected: leadDetected,
      }),
    };
  } catch (err) {
    console.error("Error en función Alma:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor", detail: err.message }),
    };
  }
};
