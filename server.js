const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

dotenv.config();

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/`;

let questions = [];
const questionsFilePath = path.join(__dirname, 'questions.json');

fs.readFile(questionsFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading questions file:', err);
        return;
    }
    questions = JSON.parse(data);
});

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
    const message = req.body.message;

    if (message && message.text) {
        const chatId = message.chat.id;
        const text = message.text;

        if (text === '/start') {
            sendQuestion(chatId, 0);
        } else {
            const userData = text.split('_');
            const questionIndex = parseInt(userData[0]);
            const answer = userData.slice(1).join('_').trim();
            checkAnswer(chatId, questionIndex, answer);
        }
    }

    res.sendStatus(200);
});

const sendQuestion = async (chatId, questionIndex) => {
    if (questionIndex < questions.length) {
        const questionData = questions[questionIndex];
        await axios.post(`${TELEGRAM_API_URL}sendMessage`, {
            chat_id: chatId,
            text: questionData.question,
            reply_markup: {
                keyboard: questionData.options.map(option => [`${questionIndex}_${option}`]),
                one_time_keyboard: true
            }
        });
    } else {
        await axios.post(`${TELEGRAM_API_URL}sendMessage`, {
            chat_id: chatId,
            text: "Все вопросы пройдены!"
        });
    }
};

const checkAnswer = async (chatId, questionIndex, answer) => {
    const questionData = questions[questionIndex];
    const correctAnswer = questionData.correct_answer.split(':')[0].trim(); // Убираем пояснения из правильного ответа для сравнения
    const userAnswer = answer.replace(/^\d+\.\s*/, '').trim(); // Убираем нумерацию из ответа пользователя

    console.log(`User answer: ${userAnswer}, Correct answer: ${correctAnswer}`); // Для отладки

    if (userAnswer === correctAnswer) {
        await axios.post(`${TELEGRAM_API_URL}sendMessage`, {
            chat_id: chatId,
            text: "Правильно!"
        });
    } else {
        await axios.post(`${TELEGRAM_API_URL}sendMessage`, {
            chat_id: chatId,
            text: `Неправильно. Правильный ответ: ${questionData.correct_answer}`
        });
    }
    sendQuestion(chatId, questionIndex + 1);
};

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
