const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.static("public"));
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


