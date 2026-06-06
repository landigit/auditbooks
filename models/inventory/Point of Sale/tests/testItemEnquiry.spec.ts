import { describe, expect, test } from '@rstest/core';
import {
  closeTestFyoAfterAll,
  getTestFyo,
  setupTestFyoBeforeAll,
} from 'tests/helpers';
import { ItemEnquiry } from 'models/baseModels/ItemEnquiry/ItemEnquiry';
import { ModelNameEnum } from 'models/types';

const fyo = getTestFyo();

describe('Item Enquiry', () => {
  setupTestFyoBeforeAll(fyo);

  test('ItemEnquiry lifecycle with similarProduct', async () => {
    const initialData = {
      item: 'Test Pen',
      customer: 'CustomerOne',
      contact: '1234567890',
      description: 'Need details about bulk purchase',
      similarProduct: 'Ink',
    };

    const newEnquiry = fyo.doc.getNewDoc(
      ModelNameEnum.ItemEnquiry,
      initialData
    ) as ItemEnquiry;
    await newEnquiry.sync();

    const createdEnquiry = (await fyo.doc.getDoc(
      ModelNameEnum.ItemEnquiry,
      newEnquiry.name as string
    )) as ItemEnquiry;

    expect(createdEnquiry).toBeDefined();
    expect(createdEnquiry.item).toBe(initialData.item);
    expect(createdEnquiry.similarProduct).toBe(initialData.similarProduct);

    const updatedData = {
      description: 'Updated enquiry details',
      similarProduct: 'Gel Pen',
    };

    createdEnquiry.description = updatedData.description;
    createdEnquiry.similarProduct = updatedData.similarProduct;
    await createdEnquiry.sync();

    const updatedEnquiry = (await fyo.doc.getDoc(
      ModelNameEnum.ItemEnquiry,
      newEnquiry.name as string
    )) as ItemEnquiry;

    expect(updatedEnquiry.description).toBe(updatedData.description);
    expect(updatedEnquiry.similarProduct).toBe(updatedData.similarProduct);
  });

  closeTestFyoAfterAll(fyo);
});
