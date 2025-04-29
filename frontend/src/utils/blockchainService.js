import { ethers } from 'ethers';
import { contractAddress, contractABI } from './contractConfig';
import { formatBookData } from './bookFormUtils';

/**
 * Creates a contract instance
 * @param {Object} library - Web3 provider library
 * @param {boolean} useSigner - Whether to use signer or provider
 * @returns {Object} - Contract instance
 */
export const getContract = (library, useSigner = false) => {
  if (!library || !contractAddress) {
    console.error('Library or contract address missing');
    return null;
  }

  try {
    const contractWithProvider = new ethers.Contract(
      contractAddress,
      contractABI,
      useSigner ? library.getSigner() : library
    );

    return contractWithProvider;
  } catch (error) {
    console.error('Error creating contract instance:', error);
    return null;
  }
};

/**
 * Load all books from the contract
 * @param {Object} library - Web3 provider library
 * @returns {Promise<Object>} - Promise resolving to object with available and rented books
 */
export const loadAllBooks = async (library) => {
  if (!library || !contractAddress) {
    return { availableBooks: [], rentedBooks: [] };
  }

  try {
    const contract = getContract(library);
    if (!contract) {
      throw new Error('Failed to create contract instance');
    }

    const code = await library.getCode(contractAddress);
    if (code === '0x') {
      throw new Error('Contract not deployed at the specified address');
    }

    const bookCount = await contract.getBookCount();
    
    if (bookCount.toNumber() === 0) {
      return { availableBooks: [], rentedBooks: [] };
    }

    const availableBooksData = [];
    const rentedBooksData = [];
    
    for (let i = 0; i < bookCount; i++) {
      try {
        const book = await contract.getBook(i);
        const bookData = formatBookData(book, i);
        
        if (book.isAvailable) {
          availableBooksData.push(bookData);
        } else {
          rentedBooksData.push(bookData);
        }
      } catch (err) {
        console.error(`Error loading book ${i}:`, err);
      }
    }
    
    return { availableBooks: availableBooksData, rentedBooks: rentedBooksData };
  } catch (err) {
    console.error('Error loading books:', err);
    throw err;
  }
};

/**
 * Load books rented by the current user
 * @param {Object} library - Web3 provider library
 * @param {string} account - User's account address
 * @returns {Promise<Array>} - Promise resolving to array of rented books
 */
export const loadRentedBooks = async (library, account) => {
  if (!library || !contractAddress || !account) {
    return [];
  }

  try {
    const contract = getContract(library);
    if (!contract) {
      throw new Error('Failed to create contract instance');
    }

    const bookCount = await contract.getBookCount();
    const booksData = [];
    
    for (let i = 0; i < bookCount; i++) {
      try {
        const book = await contract.getBook(i);
        if (!book.isAvailable && book.renter.toLowerCase() === account.toLowerCase()) {
          const rentalDuration = Math.floor(
            (Date.now() / 1000 - book.rentalStartTime.toNumber()) / 60
          );
          const totalRent = ethers.BigNumber.from(book.dailyPrice).mul(rentalDuration);
          const estimatedRefund = ethers.BigNumber.from(book.deposit).sub(totalRent);

          booksData.push({
            ...formatBookData(book, i),
            rentalDuration,
            totalRent: ethers.utils.formatEther(totalRent),
            estimatedRefund: estimatedRefund.lt(0) ? "0" : ethers.utils.formatEther(estimatedRefund)
          });
        }
      } catch (err) {
        console.error(`Error loading book ${i}:`, err);
      }
    }

    return booksData;
  } catch (err) {
    console.error('Error loading rented books:', err);
    throw err;
  }
};

/**
 * Load books owned by the current user
 * @param {Object} library - Web3 provider library
 * @param {string} account - User's account address
 * @returns {Promise<Object>} - Promise resolving to object with available and rented-out books
 */
export const loadMyBooks = async (library, account) => {
  if (!library || !contractAddress || !account) {
    return { availableBooks: [], rentedOutBooks: [] };
  }

  try {
    const contract = getContract(library);
    if (!contract) {
      throw new Error('Failed to create contract instance');
    }

    const bookCount = await contract.getBookCount();
    const availableBooksData = [];
    const rentedOutBooksData = [];
    
    for (let i = 0; i < bookCount; i++) {
      try {
        const book = await contract.getBook(i);
        // Check if this book is owned by the current user
        if (book.owner.toLowerCase() === account.toLowerCase()) {
          const baseBookData = formatBookData(book, i);
          
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
              rentalDuration,
              totalRent: ethers.utils.formatEther(totalRent)
            });
          }
        }
      } catch (err) {
        console.error(`Error loading book ${i}:`, err);
      }
    }

    return { availableBooks: availableBooksData, rentedOutBooks: rentedOutBooksData };
  } catch (err) {
    console.error('Error loading my books:', err);
    throw err;
  }
};

/**
 * Rent a book from the marketplace
 * @param {Object} library - Web3 provider library
 * @param {string} account - User's account address
 * @param {number} bookId - ID of the book to rent
 * @param {string} deposit - Deposit amount
 * @param {string} dailyPrice - Price per minute
 * @returns {Promise<Object>} - Promise resolving to transaction receipt
 */
export const rentBook = async (library, account, bookId, deposit, dailyPrice) => {
  if (!library || !contractAddress || !account) {
    throw new Error('Missing required parameters');
  }

  const contract = getContract(library, true);
  if (!contract) {
    throw new Error('Failed to create contract instance');
  }

  // First check if the book is still available
  const book = await contract.getBook(bookId);
  if (!book.isAvailable) {
    throw new Error('This book is no longer available for rent.');
  }

  // Check if user is trying to rent their own book
  if (book.owner.toLowerCase() === account.toLowerCase()) {
    throw new Error('You cannot rent your own book.');
  }

  // Calculate total payment (deposit + first minute's rent)
  const depositAmount = ethers.utils.parseEther(deposit.toString());
  const priceAmount = ethers.utils.parseEther(dailyPrice.toString());
  const totalPayment = depositAmount.add(priceAmount);

  // Check if user has enough balance
  const balance = await library.getBalance(account);
  
  // Get current gas price with a small buffer
  const gasPrice = (await library.getGasPrice()).mul(12).div(10); // Add 20% buffer
  
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
    
    throw new Error(
      `Insufficient funds for transaction:\n` +
      `- Your balance: ${formattedBalance} ETH\n` +
      `- Required payment: ${ethers.utils.formatEther(totalPayment)} ETH\n` +
      `- Estimated gas cost: ${formattedGasCost} ETH\n` +
      `- Total required: ${formattedRequired} ETH\n\n` +
      `Please add ${(parseFloat(formattedRequired) - parseFloat(formattedBalance)).toFixed(6)} ETH to your wallet.`
    );
  }
  
  // Send transaction with explicit parameters
  const tx = await contract.rentItem(bookId, { 
    value: totalPayment,
    from: account,
    gasLimit: gasLimit,
    gasPrice: gasPrice,
    nonce: await library.getTransactionCount(account, 'latest')
  });

  // Wait for the transaction to be mined
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Return a rented book
 * @param {Object} library - Web3 provider library
 * @param {string} account - User's account address
 * @param {number} bookId - ID of the book to return
 * @param {Object} rentedBook - Rented book data
 * @returns {Promise<Object>} - Promise resolving to transaction data including receipt
 */
export const returnBook = async (library, account, bookId, rentedBook) => {
  if (!library || !contractAddress || !account) {
    throw new Error('Missing required parameters');
  }

  const contract = getContract(library, true);
  if (!contract) {
    throw new Error('Failed to create contract instance');
  }

  // First check if the book is still rented by the user
  const book = await contract.getBook(bookId);
  if (book.isAvailable) {
    throw new Error('This book is no longer rented.');
  }

  if (book.renter.toLowerCase() !== account.toLowerCase()) {
    throw new Error('You are not the renter of this book.');
  }

  // Calculate rental duration and total rent
  const rentalDuration = Math.floor(
    (Date.now() / 1000 - book.rentalStartTime.toNumber()) / 60
  ) || 1; // Minimum 1 minute

  const totalRentBN = book.dailyPrice.mul(rentalDuration);
  const depositBN = book.deposit;
  
  let txData = {};
  
  // Check if total rent exceeds deposit
  if (totalRentBN.gt(depositBN)) {
    // Case 1: Rental amount is MORE than deposit
    const extraPayment = totalRentBN.sub(depositBN);
    const formattedExtraPayment = ethers.utils.formatEther(extraPayment);
    
    // Check if user has enough balance for extra payment
    const balance = await library.getBalance(account);
    const gasPrice = await library.getGasPrice();
    const estimatedGas = ethers.BigNumber.from(300000); // Fixed gas estimate
    const gasCost = gasPrice.mul(estimatedGas);
    const totalRequired = extraPayment.add(gasCost);

    if (balance.lt(totalRequired)) {
      const shortfall = ethers.utils.formatEther(totalRequired.sub(balance));
      throw new Error(
        `Insufficient funds for extra payment and gas. ` +
        `You need an additional ${shortfall} ETH.\n` +
        `Required breakdown:\n` +
        `- Extra payment: ${formattedExtraPayment} ETH\n` +
        `- Estimated gas: ${ethers.utils.formatEther(gasCost)} ETH`
      );
    }

    // Send transaction with extra payment
    const tx = await contract.returnItem(bookId, {
      value: extraPayment,
      gasLimit: ethers.utils.hexlify(300000)
    });

    const receipt = await tx.wait();
    
    // Process events to get actual refund amount
    const refundEvent = receipt.events.find(e => e.event === "RefundSent");
    const returnedEvent = receipt.events.find(e => e.event === "ItemReturned");
    const debugEvent = receipt.events.find(e => e.event === "DebugRefund");

    let actualRefundAmount = "0";
    if (refundEvent) {
      actualRefundAmount = ethers.utils.formatEther(refundEvent.args.amount);
    }
    
    txData = {
      receipt,
      refundAmount: actualRefundAmount,
      extraPayment: formattedExtraPayment,
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
  } else {
    // Case 2: Rental amount is LESS than deposit
    const tx = await contract.returnItem(bookId, {
      value: 0, // No extra payment needed
      gasLimit: ethers.utils.hexlify(300000)
    });

    const receipt = await tx.wait();
    
    // Process events to get actual refund amount
    const refundEvent = receipt.events.find(e => e.event === "RefundSent");
    const returnedEvent = receipt.events.find(e => e.event === "ItemReturned");
    const debugEvent = receipt.events.find(e => e.event === "DebugRefund");

    let actualRefundAmount = "0";
    if (refundEvent) {
      actualRefundAmount = ethers.utils.formatEther(refundEvent.args.amount);
    }
    
    txData = {
      receipt,
      refundAmount: actualRefundAmount,
      extraPayment: "0",
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
  }
  
  return txData;
}; 