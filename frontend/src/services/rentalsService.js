import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../utils/contractConfig';
import { formatSuccessMessage } from '../utils/notificationUtils';

/**
 * Loads books rented by the current user
 * @param {Object} params - Parameters object
 * @param {Object} params.library - Web3 library from useWeb3React
 * @param {string} params.account - User wallet address
 * @param {Function} params.setRentedBooks - State setter for rented books
 * @param {Function} params.setLoading - State setter for loading status
 * @param {Function} params.handleError - Error handler function
 * @returns {Promise<void>}
 */
export const loadRentedBooks = async ({
  library,
  account,
  setRentedBooks,
  setLoading,
  handleError
}) => {
  if (!library || !contractAddress || !account) {
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

    const bookCount = await contract.getBookCount();
    const booksData = [];
    
    for (let i = 0; i < bookCount; i++) {
      try {
        const book = await contract.getBook(i);
        if (!book.isAvailable && book.renter.toLowerCase() === account.toLowerCase()) {
          const rentalDuration = Math.floor(
            - (book.rentalStartTime.toNumber() - (Date.now() / 1000)) / 60
          );
          const totalRent = ethers.BigNumber.from(book.dailyPrice).mul(rentalDuration);
          const estimatedRefund = ethers.BigNumber.from(book.deposit).sub(totalRent);

          booksData.push({
            id: i,
            title: book.title,
            author: book.author,
            description: book.description,
            coverImage: book.coverImage,
            email: book.email,
            dailyPrice: ethers.utils.formatEther(book.dailyPrice),
            deposit: ethers.utils.formatEther(book.deposit),
            rentalStartTime: new Date(book.rentalStartTime.toNumber() * 1000),
            rentalDuration,
            totalRent: ethers.utils.formatEther(totalRent),
            estimatedRefund: estimatedRefund.lt(0) ? "0" : ethers.utils.formatEther(estimatedRefund)
          });
        }
      } catch (err) {
        console.error(`Error loading book ${i}:`, err);
      }
    }

    setRentedBooks(booksData);
  } catch (err) {
    handleError(err);
  } finally {
    setLoading(false);
  }
};

/**
 * Loads books owned by the current user
 * @param {Object} params - Parameters object
 * @param {Object} params.library - Web3 library from useWeb3React
 * @param {string} params.account - User wallet address
 * @param {Function} params.setMyAvailableBooks - State setter for available books
 * @param {Function} params.setMyRentedOutBooks - State setter for rented out books
 * @param {Function} params.handleError - Error handler function
 * @returns {Promise<void>}
 */
export const loadMyBooks = async ({
  library,
  account,
  setMyAvailableBooks,
  setMyRentedOutBooks,
  handleError
}) => {
  if (!library || !contractAddress || !account) {
    return;
  }

  try {
    const provider = library;
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    const bookCount = await contract.getBookCount();
    const availableBooksData = [];
    const rentedOutBooksData = [];
    
    for (let i = 0; i < bookCount; i++) {
      try {
        const book = await contract.getBook(i);
        // Check if this book is owned by the current user
        if (book.owner.toLowerCase() === account.toLowerCase()) {
          const baseBookData = {
            id: i,
            title: book.title,
            author: book.author,
            description: book.description,
            coverImage: book.coverImage,
            email: book.email,
            dailyPrice: ethers.utils.formatEther(book.dailyPrice),
            deposit: ethers.utils.formatEther(book.deposit),
            owner: book.owner
          };
          
          if (book.isAvailable) {
            // This book is owned by the user and is available
            availableBooksData.push(baseBookData);
          } else {
            // This book is owned by the user but is rented out
            const rentalDuration = Math.floor(
              (Date.now() / 1000 - book.rentalStartTime.toNumber()) / 60
            );
            const totalRent = ethers.BigNumber.from(book.dailyPrice).mul(rentalDuration);
            
            rentedOutBooksData.push({
              ...baseBookData,
              renter: book.renter,
              rentalStartTime: new Date(book.rentalStartTime.toNumber() * 1000),
              rentalDuration,
              totalRent: ethers.utils.formatEther(totalRent)
            });
          }
        }
      } catch (err) {
        console.error(`Error loading book ${i}:`, err);
      }
    }

    setMyAvailableBooks(availableBooksData);
    setMyRentedOutBooks(rentedOutBooksData);
  } catch (err) {
    handleError(err);
  }
};

/**
 * Loads books that have been returned by the user
 * @param {Object} params - Parameters object
 * @param {string} params.account - User wallet address
 * @param {Function} params.setReturnedBooks - State setter for returned books
 * @returns {Promise<void>}
 */
export const loadReturnedBooks = async ({
  account,
  setReturnedBooks
}) => {
  try {
    const storedBooks = localStorage.getItem('returnedBooks');
    if (storedBooks) {
      const parsedBooks = JSON.parse(storedBooks);
      const userBooks = parsedBooks.filter(book => 
        book.renter && book.renter.toLowerCase() === account.toLowerCase()
      );
      setReturnedBooks(userBooks);
    }
  } catch (err) {
    console.error('Error loading returned books:', err);
  }
};

/**
 * Handles returning a rented book
 * @param {Object} params - Parameters object
 * @param {number} params.bookId - ID of the book to return
 * @param {Object} params.library - Web3 library from useWeb3React
 * @param {string} params.account - User wallet address
 * @param {Array} params.rentedBooks - Current list of rented books
 * @param {Function} params.setReturningBookId - State setter for book being returned
 * @param {Function} params.showNotification - Function to show notifications
 * @param {Function} params.handleError - Error handler function
 * @param {Function} params.onSuccess - Callback function on successful return
 * @returns {Promise<void>}
 */
export const handleReturnBook = async ({
  bookId,
  library,
  account,
  rentedBooks,
  setReturningBookId,
  showNotification,
  handleError,
  onSuccess
}) => {
  if (!library || !contractAddress) return;

  setReturningBookId(bookId);

  try {
    const provider = library;
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      signer
    );

    // First check if the book is still rented by the user
    const book = await contract.getBook(bookId);
    if (book.isAvailable) {
      handleError(new Error('This book is no longer rented.'));
      onSuccess();
      return;
    }

    if (book.renter.toLowerCase() !== account.toLowerCase()) {
      handleError(new Error('You are not the renter of this book.'));
      return;
    }

    // Get the current book data before returning
    const currentBook = rentedBooks.find(b => b.id === bookId);
    
    // Calculate rental duration and total rent
    const rentalDuration = Math.floor(
      (Date.now() / 1000 - book.rentalStartTime.toNumber()) / 60
    ) || 1; // Minimum 1 minute

    const totalRentBN = ethers.BigNumber.from(book.dailyPrice).mul(rentalDuration);
    const depositBN = ethers.BigNumber.from(book.deposit);
    
    // Check if total rent exceeds deposit
    if (totalRentBN.gt(depositBN)) {
      // Case 1: Rental amount is MORE than deposit
      const extraPayment = totalRentBN.gt(depositBN) ? totalRentBN.sub(depositBN) : ethers.BigNumber.from(0);
      const formattedExtraPayment = ethers.utils.formatEther(extraPayment);
      const formattedTotalRent = ethers.utils.formatEther(totalRentBN);
      const formattedDeposit = ethers.utils.formatEther(depositBN);
      const formattedPricePerMinute = ethers.utils.formatEther(book.dailyPrice);
      
      // Check if user has enough balance for extra payment
      const balance = await provider.getBalance(account);
      const gasPrice = await provider.getGasPrice();
      const estimatedGas = ethers.BigNumber.from(300000); // Fixed gas estimate
      const gasCost = gasPrice.mul(estimatedGas);
      const totalRequired = extraPayment.add(gasCost);

      if (balance.lt(totalRequired)) {
        const shortfall = ethers.utils.formatEther(totalRequired.sub(balance));
        handleError(new Error(
          `Insufficient funds for extra payment and gas. ` +
          `You need an additional ${shortfall} ETH.\n` +
          `Required breakdown:\n` +
          `- Extra payment: ${formattedExtraPayment} ETH\n` +
          `- Estimated gas: ${ethers.utils.formatEther(gasCost)} ETH`
        ));
        return;
      }

      showNotification('info', 
        `Additional payment required:\n` +
        `- Rental duration: ${rentalDuration} minutes\n` +
        `- Price per minute: ${formattedPricePerMinute} ETH\n` +
        `- Total rent: ${formattedTotalRent} ETH\n` +
        `- Deposit paid: ${formattedDeposit} ETH\n` +
        `- Extra payment needed: ${formattedExtraPayment} ETH\n` +
        `Please confirm the transaction in MetaMask...`
      );

      // Send transaction with extra payment
      const tx = await contract.returnItem(bookId, {
        value: extraPayment,
        gasLimit: ethers.utils.hexlify(300000)
      });

      showNotification('info', 'Transaction submitted! Waiting for confirmation...');
      const receipt = await tx.wait();

      // Process events to get actual refund amount
      const refundEvent = receipt.events.find(e => e.event === "RefundSent");
      const returnedEvent = receipt.events.find(e => e.event === "ItemReturned");
      const debugEvent = receipt.events.find(e => e.event === "DebugRefund");

      let actualRefundAmount = "0";
      if (refundEvent) {
        actualRefundAmount = ethers.utils.formatEther(refundEvent.args.amount);
      }

      // Add to returned books history with actual refund amount
      saveReturnedBook({
        currentBook,
        actualRefundAmount,
        extraPayment: formattedExtraPayment,
        transactionHash: receipt.transactionHash,
        debugEvent,
        refundEvent,
        returnedEvent
      });

      showNotification('success', formatSuccessMessage('return'));
    } else {
      // Case 2: Rental amount is LESS than deposit
      showNotification('info', 'Returning book... Please confirm the transaction in MetaMask');
      
      const tx = await contract.returnItem(bookId, {
        value: 0, // No extra payment needed
        gasLimit: ethers.utils.hexlify(300000)
      });
      
      showNotification('info', 'Transaction submitted! Waiting for confirmation...');
      const receipt = await tx.wait();
      
      // Process events to get actual refund amount
      const refundEvent = receipt.events.find(e => e.event === "RefundSent");
      const returnedEvent = receipt.events.find(e => e.event === "ItemReturned");
      const debugEvent = receipt.events.find(e => e.event === "DebugRefund");

      let actualRefundAmount = "0";
      if (refundEvent) {
        actualRefundAmount = ethers.utils.formatEther(refundEvent.args.amount);
      }

      // Add to returned books history with actual refund amount
      saveReturnedBook({
        currentBook,
        actualRefundAmount,
        extraPayment: "0",
        transactionHash: receipt.transactionHash,
        debugEvent,
        refundEvent,
        returnedEvent
      });

      showNotification('success', formatSuccessMessage('return'));
    }
    
    onSuccess();
  } catch (err) {
    handleError(err);
  } finally {
    setReturningBookId(null);
  }
};

/**
 * Helper function to save a returned book to localStorage
 * @param {Object} params - Parameters object
 * @param {Object} params.currentBook - The book being returned
 * @param {string} params.actualRefundAmount - Refund amount as string
 * @param {string} params.extraPayment - Extra payment as string
 * @param {string} params.transactionHash - Transaction hash
 * @param {Object} params.debugEvent - Debug event data
 * @param {Object} params.refundEvent - Refund event data
 * @param {Object} params.returnedEvent - ItemReturned event data
 */
const saveReturnedBook = ({
  currentBook,
  actualRefundAmount,
  extraPayment,
  transactionHash,
  debugEvent,
  refundEvent,
  returnedEvent
}) => {
  // Create returned book object
  const returnedBook = {
    ...currentBook,
    isReturned: true,
    returnTime: new Date(),
    refundAmount: actualRefundAmount,
    extraPayment,
    transactionHash,
    events: {
      debug: debugEvent ? {
        deposit: ethers.utils.formatEther(debugEvent.args.deposit),
        totalRent: ethers.utils.formatEther(debugEvent.args.totalRent),
        rentalDuration: debugEvent.args.rentalDuration.toString(),
        additionalMinutes: debugEvent.args.additionalMinutes.toString()
      } : null,
      refund: refundEvent ? {
        to: refundEvent.args.to,
        amount: ethers.utils.formatEther(refundEvent.args.amount)
      } : null,
      returned: returnedEvent ? {
        bookId: returnedEvent.args.bookId.toString(),
        renter: returnedEvent.args.renter,
        refundAmount: ethers.utils.formatEther(returnedEvent.args.refundAmount)
      } : null
    }
  };

  // Get existing returned books
  let storedBooks = [];
  try {
    const existingData = localStorage.getItem('returnedBooks');
    if (existingData) {
      storedBooks = JSON.parse(existingData);
    }
  } catch (e) {
    console.error('Error parsing stored books:', e);
  }

  // Add new returned book and save to localStorage
  storedBooks.push(returnedBook);
  localStorage.setItem('returnedBooks', JSON.stringify(storedBooks));
};

/**
 * Loads all rental data for a user
 * @param {Object} params - Parameters object
 * @param {Object} params.library - Web3 library from useWeb3React
 * @param {string} params.account - User wallet address
 * @param {Function} params.setRentedBooks - State setter for rented books
 * @param {Function} params.setMyAvailableBooks - State setter for available books
 * @param {Function} params.setMyRentedOutBooks - State setter for rented out books
 * @param {Function} params.setLoading - State setter for loading status
 * @param {Function} params.handleError - Error handler function
 * @returns {Promise<void>}
 */
export const loadAllRentalData = async ({
  library,
  account,
  setRentedBooks,
  setMyAvailableBooks,
  setMyRentedOutBooks,
  setLoading,
  handleError
}) => {
  await Promise.all([
    loadRentedBooks({ library, account, setRentedBooks, setLoading, handleError }),
    loadMyBooks({ library, account, setMyAvailableBooks, setMyRentedOutBooks, handleError })
  ]);
}; 