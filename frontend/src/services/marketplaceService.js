import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../utils/contractConfig';
import { formatSuccessMessage } from '../utils/notificationUtils';

/**
 * Loads all books from the smart contract
 * @param {Object} params - Parameters object
 * @param {Object} params.library - Web3 library from useWeb3React
 * @param {Function} params.setAvailableBooks - State setter for available books
 * @param {Function} params.setRentedBooks - State setter for rented books
 * @param {Function} params.setLoading - State setter for loading status
 * @param {Function} params.handleError - Error handler function
 * @returns {Promise<void>}
 */
export const loadBooks = async ({
  library,
  setAvailableBooks,
  setRentedBooks,
  setLoading,
  handleError
}) => {
  if (!library || !contractAddress) {
    setLoading(false);
    return;
  }

  try {
    const provider = library;
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      handleError(new Error('Contract not deployed at the specified address'));
      setLoading(false);
      return;
    }

    const bookCount = await contract.getBookCount();
    
    if (bookCount.toNumber() === 0) {
      setAvailableBooks([]);
      setRentedBooks([]);
      setLoading(false);
      return;
    }

    const availableBooksData = [];
    const rentedBooksData = [];
    
    for (let i = 0; i < bookCount; i++) {
      try {
        const book = await contract.getBook(i);
        const bookData = {
          id: i,
          title: book.title,
          author: book.author,
          description: book.description,
          coverImage: book.coverImage,
          email: book.email,
          dailyPrice: ethers.utils.formatEther(book.dailyPrice),
          deposit: ethers.utils.formatEther(book.deposit),
          owner: book.owner,
          renter: book.renter,
          rentalStartTime: book.rentalStartTime.toNumber() ? new Date(book.rentalStartTime.toNumber() * 1000) : null,
          isAvailable: book.isAvailable
        };
        
        if (book.isAvailable) {
          availableBooksData.push(bookData);
        } else {
          rentedBooksData.push(bookData);
        }
      } catch (err) {
        console.error(`Error loading book ${i}:`, err);
      }
    }
    
    setAvailableBooks(availableBooksData);
    setRentedBooks(rentedBooksData);
  } catch (err) {
    handleError(err);
  } finally {
    setLoading(false);
  }
};

/**
 * Handles renting a book
 * @param {Object} params - Parameters object
 * @param {number} params.bookId - ID of the book to rent
 * @param {string} params.deposit - Deposit amount in ETH
 * @param {string} params.dailyPrice - Daily price in ETH
 * @param {Object} params.library - Web3 library from useWeb3React
 * @param {string} params.account - User account address
 * @param {Function} params.setRentingBookId - State setter for book being rented
 * @param {Function} params.showNotification - Function to show notifications
 * @param {Function} params.handleError - Error handler function
 * @param {Function} params.onSuccess - Callback function on successful rental
 * @returns {Promise<void>}
 */
export const handleRent = async ({
  bookId,
  deposit,
  dailyPrice,
  library,
  account,
  setRentingBookId,
  showNotification,
  handleError,
  onSuccess
}) => {
  if (!library || !contractAddress) {
    handleError(new Error('Please connect your wallet first'));
    return;
  }

  setRentingBookId(bookId);

  try {
    const provider = library;
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      signer
    );

    // First check if the book is still available
    const book = await contract.getBook(bookId);
    if (!book.isAvailable) {
      handleError(new Error('This book is no longer available for rent.'));
      onSuccess(); // Refresh the list
      return;
    }

    // Check if user is trying to rent their own book
    if (book.owner.toLowerCase() === account.toLowerCase()) {
      handleError(new Error('You cannot rent your own book.'));
      return;
    }

    // Calculate total payment (deposit + first minute's rent)
    const depositAmount = ethers.utils.parseEther(deposit.toString());
    const priceAmount = ethers.utils.parseEther(dailyPrice.toString());
    const totalPayment = depositAmount.add(priceAmount);

    // Check if user has enough balance
    const balance = await provider.getBalance(account);
    
    // Get current gas price with a small buffer
    const gasPrice = (await provider.getGasPrice()).mul(12).div(10); // Add 20% buffer
    
    // Estimate gas with the value parameter
    const gasLimit = await contract.estimateGas.rentItem(bookId, { 
      value: totalPayment,
      from: account,
      gasPrice: gasPrice
    });

    const gasCost = gasLimit.mul(gasPrice);
    const totalRequired = totalPayment.add(gasCost);

    if (balance.lt(totalRequired)) {
      const formattedBalance = ethers.utils.formatEther(balance);
      const formattedRequired = ethers.utils.formatEther(totalRequired);
      const formattedGasCost = ethers.utils.formatEther(gasCost);
      
      handleError(new Error(
        `Insufficient funds for transaction:\n` +
        `- Your balance: ${formattedBalance} ETH\n` +
        `- Required payment: ${ethers.utils.formatEther(totalPayment)} ETH\n` +
        `- Estimated gas cost: ${formattedGasCost} ETH\n` +
        `- Total required: ${formattedRequired} ETH\n\n` +
        `Please add ${(parseFloat(formattedRequired) - parseFloat(formattedBalance)).toFixed(6)} ETH to your wallet.`
      ));
      return;
    }

    showNotification('info', 'Confirming transaction... Please wait and approve in MetaMask.');
    
    // Send transaction with explicit parameters
    const tx = await contract.rentItem(bookId, { 
      value: totalPayment,
      from: account,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
      nonce: await provider.getTransactionCount(account, 'latest')
    });

    showNotification('info', 'Transaction submitted! Waiting for confirmation...');
    await tx.wait();

    showNotification('success', formatSuccessMessage('rent'));
    onSuccess();
  } catch (err) {
    handleError(err);
  } finally {
    setRentingBookId(null);
  }
}; 