module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'PSYCHO Platform API is running!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};