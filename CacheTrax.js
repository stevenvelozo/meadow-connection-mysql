/**
* Cache data structure with:
*  - enumerable items
*  - unique hash item access (if none is passed in, one is generated)
*  - size (length) expiration
*  - controllable expiration (e.g. keep in cache longer if older/less likely to change)
*  - time-based expiration
*  - custom expiration based on passed-in function
*
* Also:
*  - built to work well with browserify
*  - no dependencies at all
*  - pet friendly
*
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libLinkedList = require(`./LinkedList.js`);

class CashMoney extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		if (pFable === undefined)
		{
			super({});
		}
		else
		{
			super(pFable, pManifest, pServiceHash);
		}

        this.serviceType = 'ObjectCache';

		// The map of node objects by hash because Reasons.
		this._HashMap = {};

		this._RecordMap = {};

		this._List = new libLinkedList();

		// If the list gets over maxLength, we will automatically remove nodes on insertion.
		this.maxLength = 0;

		// If cache entries get over this age, they are removed with prune
		this.maxAge = 0;
	}

	get RecordMap()
	{
		return this._RecordMap;
	}

	// Add (or update) a node in the cache
	put(pData, pHash)
	{
		// If the hash of the record exists
		if (this._HashMap.hasOwnProperty(pHash))
		{
			// Just update the hashed records datum
			this._HashMap[pHash].Datum = pData;
			this._RecordMap[pHash] = pData;
			return this._HashMap[pHash].Datum;
		}

		let tmpNode = this._List.push(pData, pHash);
		this._HashMap[tmpNode.Hash] = tmpNode;
		this._RecordMap[pHash] = pData;

		// Automatically prune if over length, but only prune this nodes worth.
		if (this.maxLength > 0   &&   this._List.length > this.maxLength)
		{
			// Pop it off the head of the list
			tmpNode = this._List.pop();
			// Also remove it from the hashmap
			delete this._RecordMap[tmpNode.Hash];
			delete this._HashMap[tmpNode.Hash];
		}

		// Now some expiration properties on the node metadata... namely the birthdate in ms of the node
		tmpNode.Metadata.Created = +new Date();

		return tmpNode.Datum;
	}

	// Read a datum by hash from the cache
	read(pHash)
	{
		if (!this._HashMap.hasOwnProperty(pHash))
		{
			return false;
		}

		return this._HashMap[pHash].Datum;
	}

	// Reinvigorate a node based on hash, updating the timestamp and moving it to the head of the list (also removes custom metadata)
	touch(pHash)
	{
		if (!this._HashMap.hasOwnProperty(pHash))
		{
			return false;
		}

		// Get the old node out of the list
		let tmpNode = this._List.remove(this._HashMap[pHash]);
		// Remove it from the hash map
		delete this._RecordMap[pHash];
		delete this._HashMap[pHash];

		// Now put it back, fresh.
		return this.put(tmpNode.Datum, tmpNode.Hash);
	}

	// Expire a cached record based on hash
	expire(pHash)
	{
		if (!this._HashMap.hasOwnProperty(pHash))
		{
			return false;
		}

		let tmpNode = this._HashMap[pHash];

		// Remove it from the list of cached records
		tmpNode = this._List.remove(tmpNode);
		// Also remove it from the hashmap
		delete this._RecordMap[tmpNode.Hash];
		delete this._HashMap[tmpNode.Hash];

		// Return it in case the consumer wants to do anything with it
		return tmpNode;
	}

	// Prune records from the cached set based on maxAge
	pruneBasedOnExpiration(fComplete, pRemovedRecords)
	{
		let tmpRemovedRecords = (typeof(pRemovedRecords) === 'undefined') ? [] : pRemovedRecords;

		if (this.maxAge < 1)
		{
			return fComplete(tmpRemovedRecords);
		}

		// Now enumerate each record and remove any that are expired
		let tmpNow = +new Date();
		let tmpKeys = Object.keys(this._HashMap);

		for (let i = 0; i < tmpKeys.length; i++)
		{
			// Expire the node if it is older than max age milliseconds
			if (tmpNow - this._HashMap[tmpKeys[i]].Metadata.Created >= this.maxAge)
			{
				tmpRemovedRecords.push(this.expire(tmpKeys[i]));
			}
		}
		fComplete(tmpRemovedRecords);
	}

	// Prune records from the cached set based on maxLength
	pruneBasedOnLength(fComplete, pRemovedRecords)
	{
		let tmpRemovedRecords = (typeof(pRemovedRecords) === 'undefined') ? [] : pRemovedRecords;

		// Pop records off until we have reached maxLength unless it's 0
		if (this.maxLength > 0)
		{
			while (this._List.length > this.maxLength)
			{
				tmpRemovedRecords.push(this._List.pop());
			}
		}

		return fComplete(tmpRemovedRecords);
	}

	// Prune records from the cached set based on passed in pPruneFunction(pDatum, pHash, pNode) -- returning true expires it
	pruneCustom(fComplete, fPruneFunction, pRemovedRecords)
	{
		let tmpRemovedRecords = (typeof(pRemovedRecords) === 'undefined') ? [] : pRemovedRecords;

		let tmpKeys = Object.keys(this._HashMap);
		for (let i = 0; i < tmpKeys.length; i++)
		{
			let tmpNode = this._HashMap[tmpKeys[i]];
			// Expire the node if the passed in function returns true
			if (fPruneFunction(tmpNode.Datum, tmpNode.Hash, tmpNode))
			{
				tmpRemovedRecords.push(this.expire(tmpKeys[i]));
			}
		}
		fComplete(tmpRemovedRecords);
	}

	// Prune the list down to the asserted rules (max age then max length if still too long)
	prune(fComplete)
	{
		let tmpRemovedRecords = [];

		// If there are no cached records, we are done.
		if (this._List.length < 1)
		{
			return fComplete(tmpRemovedRecords);
		}

		// Now prune based on expiration time
		this.pruneBasedOnExpiration((fExpirationPruneComplete)=>
			{
				// Now prune based on length, then return the removed records in the callback.
				this.pruneBasedOnLength(fComplete, tmpRemovedRecords);
			}, tmpRemovedRecords);
	}

	// Get a low level node (including metadata statistics) by hash from the cache
	getNode(pHash)
	{
		if (!this._HashMap.hasOwnProperty(pHash))
			return false;

		return this._HashMap[pHash];
	}
}

module.exports = CashMoney;