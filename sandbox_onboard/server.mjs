import express from 'express';
import cors from 'cors';

const app = express();
const port = 7079;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.listen(port, () => {
  console.log(`🌍 Sandbox Onboard listening on port ${port}`);
});