const isVerifiedVendor = (req, res, next) => {
  // This middleware should run AFTER protect and authorize('vendor')
  if (!req.user || req.user.role !== 'vendor') {
    return res.status(403).json({
      message: 'Access denied. Only vendors can perform this action.'
    });
  }

  if (!req.user.vendorInfo || req.user.vendorInfo.isVerified !== true) {
    return res.status(403).json({
      message: 'Access denied. Your vendor account has not been verified by an admin yet.'
    });
  }

  next();
};

module.exports = { isVerifiedVendor };
