const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { sanitizeBody } = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Number of reverse proxies in front of the app, so rate limiting sees the real client IP
// (e.g. 2 for Vercel rewrite -> Render load balancer).
app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

app.use(
  helmet({
    // Avatars are loaded by the frontend from another origin in development.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(
  express.json({
    limit: '200kb',
    // Raw body is needed to verify the WhatsApp webhook signature.
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith('/api/webhooks/')) req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(cookieParser());
app.use(sanitizeBody);
if (!env.isProd) app.use(morgan('dev'));

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { maxAge: '7d', index: false }));
app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
