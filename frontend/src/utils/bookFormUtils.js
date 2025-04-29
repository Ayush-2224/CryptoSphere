import { ethers } from 'ethers';
import { uploadImageToPinata } from './pinataConfig';
import { categorizeError } from './notificationUtils';

/**
 * Validates book form inputs
 * @param {Object} formData - Book form data
 * @returns {Object} - Validation result with isValid and errorMessage
 */
export const validateBookForm = (formData) => {
  const { title, author, email, dailyPrice, deposit } = formData;
  
  if (!title.trim()) {
    return { isValid: false, errorMessage: 'Title is required' };
  }
  
  if (!author.trim()) {
    return { isValid: false, errorMessage: 'Author is required' };
  }
  
  if (!email.trim()) {
    return { isValid: false, errorMessage: 'Email is required' };
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, errorMessage: 'Please enter a valid email address' };
  }
  
  if (!dailyPrice || isNaN(parseFloat(dailyPrice)) || parseFloat(dailyPrice) <= 0) {
    return { isValid: false, errorMessage: 'Please enter a valid price' };
  }
  
  if (!deposit || isNaN(parseFloat(deposit)) || parseFloat(deposit) <= 0) {
    return { isValid: false, errorMessage: 'Please enter a valid deposit amount' };
  }
  
  if (parseFloat(deposit) < parseFloat(dailyPrice)) {
    return { isValid: false, errorMessage: 'Deposit must be greater than or equal to the price' };
  }
  
  return { isValid: true };
};

/**
 * Validates image file before upload
 * @param {File} file - Image file to validate
 * @returns {Object} - Validation result with isValid and errorMessage
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { isValid: false, errorMessage: 'Please select an image file' };
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { isValid: false, errorMessage: 'Image file is too large. Maximum size is 5MB' };
  }
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { isValid: false, errorMessage: 'Invalid file type. Please upload a JPEG, PNG, GIF or WebP image' };
  }
  
  return { isValid: true };
};

/**
 * Handle image upload to IPFS via Pinata
 * @param {File} file - Image file to upload
 * @param {Object} metadata - Book metadata to include
 * @param {Function} onStart - Callback when upload starts
 * @param {Function} onSuccess - Callback when upload succeeds
 * @param {Function} onError - Callback when upload fails
 * @returns {Promise<string|null>} - Promise resolving to IPFS URL or null on failure
 */
export const handleImageUpload = async (file, metadata, onStart, onSuccess, onError) => {
  if (!file) {
    const error = new Error('Please select an image first');
    if (onError) onError(error);
    return null;
  }

  try {
    if (onStart) onStart();
    
    // Upload image to IPFS using Pinata with metadata
    const ipfsUrl = await uploadImageToPinata(file, metadata);
    
    if (onSuccess) onSuccess(ipfsUrl);
    return ipfsUrl;
  } catch (err) {
    console.error('Error uploading image to IPFS:', err);
    if (onError) onError(err);
    return null;
  }
};

/**
 * Submit book information to the blockchain
 * @param {Object} formData - Book form data
 * @param {Object} options - Options including contract, signer, callbacks
 * @returns {Promise<boolean>} - Promise resolving to success status
 */
export const submitBookToBlockchain = async (formData, options) => {
  const { 
    title, author, description, email, coverImageUrl, 
    dailyPrice, deposit 
  } = formData;
  
  const { 
    contract, 
    onStart, 
    onSubmitted, 
    onSuccess, 
    onError 
  } = options;
  
  try {
    if (onStart) onStart();
    
    const dailyPriceWei = ethers.utils.parseEther(dailyPrice);
    const depositWei = ethers.utils.parseEther(deposit);
    
    // Log parameters for debugging
    console.log("Listing book with params:", {
      title,
      author,
      description,
      coverImageUrl,
      email,
      dailyPriceWei: dailyPriceWei.toString(),
      depositWei: depositWei.toString()
    });
    
    // Submit transaction
    const tx = await contract.listItem(
      title,
      author,
      description,
      coverImageUrl,
      email,
      dailyPriceWei,
      depositWei
    );
    
    if (onSubmitted) onSubmitted(tx);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    if (onSuccess) onSuccess(receipt);
    return true;
  } catch (err) {
    console.error('Error in submitBookToBlockchain:', err);
    if (onError) onError(err);
    return false;
  }
};

/**
 * Format book data from contract for UI display
 * @param {Object} book - Raw book data from contract
 * @param {number} id - Book ID
 * @returns {Object} - Formatted book data
 */
export const formatBookData = (book, id) => {
  return {
    id,
    title: book.title,
    author: book.author,
    description: book.description,
    coverImage: book.coverImage,
    email: book.email,
    dailyPrice: ethers.utils.formatEther(book.dailyPrice),
    deposit: ethers.utils.formatEther(book.deposit),
    owner: book.owner,
    renter: book.renter,
    rentalStartTime: book.rentalStartTime.toNumber() ? 
      new Date(book.rentalStartTime.toNumber() * 1000) : null,
    isAvailable: book.isAvailable
  };
};

/**
 * Calculate rental metrics for a book
 * @param {Object} book - Book data
 * @returns {Object} - Calculated metrics including duration, total rent, etc.
 */
export const calculateRentalMetrics = (book) => {
  if (!book.rentalStartTime) {
    return null;
  }
  
  // Calculate rental duration in minutes
  const rentalDuration = Math.floor(
    (Date.now() / 1000 - book.rentalStartTime.getTime() / 1000) / 60
  );
  
  // Convert string values to BigNumber for calculations
  const dailyPriceBN = ethers.utils.parseEther(book.dailyPrice);
  const depositBN = ethers.utils.parseEther(book.deposit);
  
  // Calculate total rent
  const totalRentBN = dailyPriceBN.mul(rentalDuration);
  const totalRent = ethers.utils.formatEther(totalRentBN);
  
  // Calculate estimated refund (deposit - totalRent)
  const estimatedRefundBN = depositBN.sub(totalRentBN);
  const estimatedRefund = estimatedRefundBN.lt(0) ? 
    "0" : ethers.utils.formatEther(estimatedRefundBN);
  
  // Check if rent exceeds deposit
  const rentExceedsDeposit = totalRentBN.gt(depositBN);
  
  // Calculate extra payment if rent exceeds deposit
  let extraPayment = "0";
  if (rentExceedsDeposit) {
    extraPayment = ethers.utils.formatEther(totalRentBN.sub(depositBN));
  }
  
  return {
    rentalDuration,
    totalRent,
    estimatedRefund,
    rentExceedsDeposit,
    extraPayment
  };
}; 