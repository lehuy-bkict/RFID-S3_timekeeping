import { useState, useEffect, useRef } from 'react';
import '../table.3/index.css';
function Table3({
  titleArr,
  actionArr,
  dataArr,
  currentPage,
  totalPages,
  handlePagination,
  limit,
  handleChangeLimit,
  onSelect = (ids) => { },
  selectedId,
}) {
  // eslint-disable-next-line no-unused-vars
  const [openMenuId, setOpenMenuId] = useState(undefined);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenMenuId(undefined);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getPageNumbers = () => {
    const pageNumbers = [];
    pageNumbers.push(1);
    if (totalPages === 1) {
      return pageNumbers;
    }
    if (currentPage <= 4) {
      for (let i = 2; i <= 5; i++) {
        if (i < totalPages) pageNumbers.push(i);
      }
      if (totalPages > 5) pageNumbers.push('...');
    } else if (currentPage >= totalPages - 3) {
      pageNumbers.push('...');
      for (let i = totalPages - 4; i < totalPages; i++) {
        if (i > 1) pageNumbers.push(i);
      }
    } else {
      pageNumbers.push('...');
      for (let i = currentPage - 2; i <= currentPage + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
    }

    pageNumbers.push(totalPages);
    return pageNumbers;
  };

  const handlePageClick = (page) => {
    if (page !== '...') {
      handlePagination(page);
    }
  };

  if (titleArr.length <= 0) {
    return (
      <div className="my-table">
        <table>
          <thead>
            <tr>
              <th></th>
            </tr>
          </thead>
        </table>
      </div>
    );
  }

  return (
    <div className="my-table">
      <table>
        <thead>
          <tr>
            {titleArr?.map((item, index) => (
              <th key={index} className="text-center">{item}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataArr?.map((datas, dataindex) => (
            <tr
              style={
                selectedId?.idRoot === datas.id && selectedId?.idChild === datas.childId
                  ? { cursor: 'pointer' }
                  : {}
              }
              key={dataindex}
              className={`${dataindex % 2 === 0 ? 'my-table-tr-backgroud-none' : 'my-table-tr-backgroud-paint'
                }`}
            >

              {Object.keys(datas)?.map((key, index) => {
                if (key !== 'id' && key !== 'childId') {
                  return (
                    <td
                      key={index}
                      className={`my-table-tbody-td-special ${selectedId?.idRoot === datas.id && selectedId?.idChild === datas.childId ? 'active' : ''} text-center`}
                    >
                      {datas[key]}
                    </td>
                  );
                }
                return null;
              })}
              <td className="my-table-tbody-td-action my-table-tbody-td-special text-center">
                <div className="my-table-icon">
                  {actionArr?.map((action, index) => (
                    action.isVisible && (
                      <div
                        title={action.title}
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.callback(e, datas, action);
                        }}
                      >
                        {action.icon}
                      </div>
                    )
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>

      </table>

      {totalPages > 0 && (
        <div className="pagebreak">
          <i
            className={`bi bi-arrow-left-circle ${currentPage === 1 ? 'disabled-icon' : ''}`}
            onClick={() => handlePagination(currentPage - 1)}
          ></i>
          <ul className="pagination">
            {getPageNumbers()?.map((page, index) => (
              <li key={index} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                <button
                  className={`page-link ${typeof page === 'string' ? 'cursor-not-allowed' : ''}`}
                  disabled={typeof page === 'string'}
                  onClick={() => handlePageClick(page)}
                >
                  {page}
                </button>
              </li>
            ))}
          </ul>
          <i
            className={`bi bi-arrow-right-circle ${currentPage === totalPages ? 'disabled-icon' : ''
              }`}
            onClick={() => handlePagination(currentPage + 1)}
          ></i>
          <select value={limit} onChange={handleChangeLimit} className="page-size-selector">
            <option value="10">10 / Page</option>
            <option value="20">20 / Page</option>
            <option value="50">50 / Page</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default Table3;
